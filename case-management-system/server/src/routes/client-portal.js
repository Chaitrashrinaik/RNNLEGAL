const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { queryOne, queryAll, getDb } = require('../config/db');
const Client = require('../models/Client');
const Case = require('../models/Case');
const { parseCase, parseJson } = Case;
const { parseInvoice } = require('../models/Invoice');
const { parseDoc } = require('../models/Document');
const { paginationHelper, paginateResults } = require('../utils/helpers');
const { sendOtpEmail } = require('../utils/email');
const { authLimiter, otpLimiter } = require('../middleware/security');
const { getCloudinaryUrl, getCloudinaryConfigured } = require('../middleware/upload');

const router = express.Router();

const clientAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'client') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [decoded.id]);
    if (!client) {
      return res.status(401).json({ success: false, message: 'Client account not found' });
    }
    req.client = Client.parseClient(client);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const signClientToken = (client) => {
  return jwt.sign({ id: client.id, type: 'client' }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const cleanMobile = (mobile) => mobile.replace(/\s+/g, '').replace(/^(\+91)/, '');

const parseNotifications = (rows) => rows.map(n => ({ ...n, _id: n.id }));

const parseMessages = (rows) => rows.map(m => {
  const parsed = { ...m, _id: m.id };
  parsed.attachments = parseJson(m.attachments, []);
  return parsed;
});

const parseAppointments = (rows) => rows.map(a => ({ ...a, _id: a.id }));

// ==================== AUTH ====================

router.post(
  '/login', authLimiter,
  [body('mobile').trim().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { mobile } = req.body;
      const clean = cleanMobile(mobile);

      const client = await queryOne('SELECT * FROM clients WHERE phone = ? OR phone = ? OR phone = ?', [
        clean, `+91${clean}`, `91${clean}`,
      ]);

      if (!client) {
        return res.status(401).json({ success: false, message: 'Mobile number is not registered' });
      }

      if (!client.portalEnabled) {
        return res.status(403).json({ success: false, message: 'Account is inactive. Please contact your advocate.' });
      }

      const now = new Date().toISOString();
      await getDb().execute('UPDATE clients SET portalLastAccessed = ? WHERE id = ?', [now, client.id]);

      const token = signClientToken(client);

      console.log(`[CLIENT LOGIN] Client: ${client.name} (${client.phone}) - SUCCESS at ${now}`);

      res.json({
        success: true,
        data: {
          client: Client.sanitize(client),
          token,
        },
      });
    } catch (error) {
      console.error('Client login error:', error.message);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  }
);

router.post('/forgot-password', otpLimiter, [body('mobile').trim().notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobile } = req.body;
    const clean = cleanMobile(mobile);

    const client = await queryOne('SELECT * FROM clients WHERE phone = ? OR phone = ? OR phone = ?', [
      clean, `+91${clean}`, `91${clean}`,
    ]);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Mobile number is not registered' });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await getDb().execute('UPDATE clients SET resetOtp = ?, resetOtpExpiry = ? WHERE id = ?', [otp, expiry, client.id]);

    console.log(`[CLIENT FORGOT PASSWORD] OTP sent to ${client.name} (${client.phone})`);

    if (client.email) {
      await sendOtpEmail(client.email, client.name, otp);
    }

    res.json({
      success: true,
      message: 'OTP sent to your registered email',
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/verify-otp', otpLimiter, [
  body('mobile').trim().notEmpty(),
  body('otp').trim().isLength({ min: 6, max: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobile, otp } = req.body;
    const clean = cleanMobile(mobile);

    const client = await queryOne('SELECT * FROM clients WHERE phone = ? OR phone = ? OR phone = ?', [
      clean, `+91${clean}`, `91${clean}`,
    ]);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Mobile number is not registered' });
    }

    if (!client.resetOtp || client.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (client.resetOtpExpiry && new Date(client.resetOtpExpiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reset-password', [
  body('mobile').trim().notEmpty(),
  body('otp').trim().isLength({ min: 6, max: 6 }),
  body('newPassword').trim().isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobile, otp, newPassword } = req.body;
    const clean = cleanMobile(mobile);

    const client = await queryOne('SELECT * FROM clients WHERE phone = ? OR phone = ? OR phone = ?', [
      clean, `+91${clean}`, `91${clean}`,
    ]);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Mobile number is not registered' });
    }

    if (!client.resetOtp || client.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (client.resetOtpExpiry && new Date(client.resetOtpExpiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await getDb().execute(
      'UPDATE clients SET portalPassword = ?, resetOtp = NULL, resetOtpExpiry = NULL, portalEnabled = 1, updatedAt = ? WHERE id = ?',
      [hashedPassword, new Date().toISOString(), client.id]
    );

    res.json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== DASHBOARD ====================

router.get('/dashboard', clientAuth, async (req, res) => {
  try {
    const clientId = req.client.id;
    const now = new Date().toISOString();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const totalCases = (await queryOne('SELECT COUNT(*) as c FROM cases WHERE clientId = ?', [clientId]))?.c || 0;
    const activeCases = (await queryOne("SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND status IN ('active','in-progress')", [clientId]))?.c || 0;
    const closedCases = (await queryOne("SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND status IN ('closed','disposed','won','lost')", [clientId]))?.c || 0;
    const pendingCases = (await queryOne("SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND status = 'pending'", [clientId]))?.c || 0;

    const upcomingHearings = (await queryOne(
      "SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND nextHearingDate >= ? AND nextHearingDate <= ? AND status IN ('active','in-progress','pending')",
      [clientId, now, thirtyDays]
    ))?.c || 0;

    const todayHearings = (await queryOne(
      "SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND nextHearingDate >= ? AND nextHearingDate <= ?",
      [clientId, todayStart, todayEnd]
    ))?.c || 0;

    const pendingAmountR = await queryOne("SELECT COALESCE(SUM(total - paidAmount), 0) as r FROM invoices WHERE clientId = ? AND status IN ('sent','overdue')", [clientId]);
    const pendingAmount = pendingAmountR?.r || 0;
    const paidAmountR = await queryOne("SELECT COALESCE(SUM(paidAmount), 0) as r FROM invoices WHERE clientId = ? AND status = 'paid'", [clientId]);
    const paidAmount = paidAmountR?.r || 0;

    const totalDocs = (await queryOne(
      'SELECT COUNT(*) as c FROM documents d JOIN cases c ON d.caseId = c.id WHERE c.clientId = ?', [clientId]
    ))?.c || 0;

    const unreadNotifications = (await queryOne(
      'SELECT COUNT(*) as c FROM client_notifications WHERE clientId = ? AND isRead = 0', [clientId]
    ))?.c || 0;

    const unreadMessages = (await queryOne(
      "SELECT COUNT(*) as c FROM messages WHERE receiverId = ? AND receiverType = 'client' AND isRead = 0", [clientId]
    ))?.c || 0;

    const recentCases = (await queryAll(
      'SELECT * FROM cases WHERE clientId = ? ORDER BY createdAt DESC LIMIT 5', [clientId]
    )).map(c => {
      const parsed = parseCase(c);
      return { id: parsed.id, _id: parsed.id, caseNumber: parsed.caseNumber, caseTitle: parsed.caseTitle, status: parsed.status, nextHearingDate: parsed.nextHearingDate, courtName: parsed.courtName, priority: parsed.priority };
    });

    const upcomingHearingCases = (await queryAll(
      "SELECT * FROM cases WHERE clientId = ? AND nextHearingDate >= ? AND nextHearingDate <= ? AND status IN ('active','in-progress','pending') ORDER BY nextHearingDate ASC LIMIT 5",
      [clientId, now, thirtyDays]
    )).map(c => {
      const parsed = parseCase(c);
      return { id: parsed.id, _id: parsed.id, caseNumber: parsed.caseNumber, caseTitle: parsed.caseTitle, nextHearingDate: parsed.nextHearingDate, courtName: parsed.courtName, judgeName: parsed.judgeName, priority: parsed.priority };
    });

    const recentDocuments = (await queryAll(
      'SELECT d.id,d.title,d.originalName,d.category,d.fileSize,d.mimeType,d.cloudUrl,d.cloudPublicId,d.thumbnailUrl,d.createdAt FROM documents d JOIN cases c ON d.caseId = c.id WHERE c.clientId = ? ORDER BY d.createdAt DESC LIMIT 5',
      [clientId]
    )).map(d => { d._id = d.id; d.fileUrl = d.cloudUrl || null; return d; });

    const recentInvoices = (await queryAll(
      'SELECT * FROM invoices WHERE clientId = ? ORDER BY createdAt DESC LIMIT 5', [clientId]
    )).map(i => parseInvoice(i));

    res.json({
      success: true,
      data: {
        client: Client.sanitize(req.client),
        summary: {
          totalCases, activeCases, closedCases, pendingCases,
          upcomingHearings, todayHearings,
          pendingAmount, paidAmount, totalDocs,
          unreadNotifications, unreadMessages,
        },
        recentCases,
        upcomingHearingCases,
        recentDocuments,
        recentInvoices,
      },
    });
  } catch (error) {
    console.error('Client dashboard error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard' });
  }
});

// ==================== CASES ====================

router.get('/cases', clientAuth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const { page: pg, limit: lim, skip } = paginationHelper(page, limit);

    let where = 'WHERE c.clientId = ?';
    const params = [req.client.id];

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) { where += ' AND c.status = ?'; params.push(statuses[0]); }
      else if (statuses.length > 1) { where += ` AND c.status IN (${statuses.map(() => '?').join(',')})`; params.push(...statuses); }
    }

    if (search) {
      where += ' AND (c.caseNumber LIKE ? OR c.caseTitle LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const total = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${where}`, params))?.c || 0;

    const casesRaw = await queryAll(
      `SELECT c.* FROM cases c ${where} ORDER BY c.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, lim, skip]
    );

    const cases = await Promise.all(casesRaw.map(async c => {
      const parsed = parseCase(c);
      const advocates = await Case.getAdvocates(c.id);
      return {
        id: parsed.id, _id: parsed.id,
        caseNumber: parsed.caseNumber, caseTitle: parsed.caseTitle,
        caseType: parsed.caseType, court: parsed.court, courtName: parsed.courtName,
        judgeName: parsed.judgeName,
        filingDate: parsed.filingDate, nextHearingDate: parsed.nextHearingDate,
        status: parsed.status, priority: parsed.priority, description: parsed.description,
        oppositeParty: parsed.oppositeParty, oppositePartyLawyer: parsed.oppositePartyLawyer,
        assignedAdvocates: advocates.map(a => ({ id: a.id, _id: a.id, name: a.name, email: a.email, phone: a.phone })),
      };
    }));

    res.json({ success: true, data: cases, pagination: paginateResults(total, pg, lim) });
  } catch (error) {
    console.error('Client cases error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching cases' });
  }
});

router.get('/cases/:id', clientAuth, async (req, res) => {
  try {
    const caseItem = await queryOne('SELECT * FROM cases WHERE id = ? AND clientId = ?', [req.params.id, req.client.id]);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const parsed = parseCase(caseItem);
    const advocates = await Case.getAdvocates(caseItem.id);

    const docs = (await queryAll('SELECT * FROM documents WHERE caseId = ?', [caseItem.id]))
      .map(d => {
        const p = parseDoc(d);
        return { ...p, _id: p.id };
      });

    const hearingHistory = parseJson(caseItem.hearingHistory, []);
    const dbHearings = await queryAll(
      'SELECT * FROM hearings WHERE caseId = ? ORDER BY hearingDate DESC', [caseItem.id]
    );
    const allHearings = [...hearingHistory, ...dbHearings.map(h => ({
      date: h.hearingDate,
      court: h.courtName || h.court,
      judge: h.judgeName,
      outcome: h.outcome || h.status,
      notes: h.notes,
    }))];
    const orders = parseJson(caseItem.orders, []);
    const notes = (parseJson(caseItem.notes, []) || []).filter(n => n.visibleToClient !== false);

    const client = caseItem.clientId ? await queryOne('SELECT id,name,email,phone,company FROM clients WHERE id = ?', [caseItem.clientId]) : null;
    if (client) client._id = client.id;

    res.json({
      success: true,
      data: {
        ...parsed,
        client,
        assignedAdvocates: advocates.map(a => { a._id = a.id; return a; }),
        documents: docs,
        hearingHistory: allHearings,
        orders,
        notes,
      },
    });
  } catch (error) {
    console.error('Client case detail error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching case details' });
  }
});

router.get('/cases/:id/timeline', clientAuth, async (req, res) => {
  try {
    const caseItem = await queryOne('SELECT * FROM cases WHERE id = ? AND clientId = ?', [req.params.id, req.client.id]);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const parsed = parseCase(caseItem);
    const timeline = [];

    timeline.push({
      type: 'case-created', date: parsed.createdAt,
      title: 'Case Filed', description: `Case ${parsed.caseNumber} was created`,
    });

    if (parsed.filingDate) {
      timeline.push({
        type: 'filing', date: parsed.filingDate,
        title: 'Case Filed in Court', description: `Filed in ${parsed.courtName || parsed.court}`,
      });
    }

    for (const hearing of (parsed.hearingHistory || [])) {
      timeline.push({
        type: 'hearing', date: hearing.date,
        title: 'Hearing Conducted', description: hearing.notes || 'No notes',
        outcome: hearing.outcome,
      });
    }

    for (const order of (parsed.orders || [])) {
      timeline.push({
        type: 'order', date: order.date,
        title: 'Court Order', description: order.description,
      });
    }

    const docs = await queryAll('SELECT id,title,createdAt,uploadedBy FROM documents WHERE caseId = ?', [caseItem.id]);
    for (const d of docs) {
      const uploader = d.uploadedBy ? await queryOne('SELECT name FROM users WHERE id = ?', [d.uploadedBy]) : null;
      timeline.push({
        type: 'document', date: d.createdAt,
        title: 'Document Uploaded', description: `"${d.title}" uploaded by ${uploader?.name || 'Unknown'}`,
      });
    }

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('Client timeline error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== HEARINGS ====================

router.get('/hearings', clientAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { page: pg, limit: lim, skip } = paginationHelper(page, limit);

    let where = 'WHERE c.clientId = ?';
    const params = [req.client.id];

    if (status) { where += ' AND h.status = ?'; params.push(status); }

    const total = (await queryOne(
      `SELECT COUNT(*) as c FROM hearings h JOIN cases c ON h.caseId = c.id ${where}`, params
    ))?.c || 0;

    const hearings = (await queryAll(
      `SELECT h.*, c.caseNumber, c.caseTitle, c.court, c.courtName as caseCourtName, c.judgeName as caseJudgeName
       FROM hearings h JOIN cases c ON h.caseId = c.id ${where} ORDER BY h.hearingDate DESC LIMIT ? OFFSET ?`,
      [...params, lim, skip]
    )).map(h => ({
      ...h, _id: h.id,
      hearingDate: h.hearingDate ? new Date(h.hearingDate).toISOString() : null,
      nextHearingDate: h.nextHearingDate ? new Date(h.nextHearingDate).toISOString() : null,
    }));

    res.json({ success: true, data: hearings, pagination: paginateResults(total, pg, lim) });
  } catch (error) {
    console.error('Client hearings error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== DOCUMENTS ====================

router.get('/documents', clientAuth, async (req, res) => {
  try {
    const { caseId, search, page = 1, limit = 50 } = req.query;
    const { page: pg, limit: lim, skip } = paginationHelper(page, limit);

    let where = 'WHERE c.clientId = ?';
    const params = [req.client.id];

    if (caseId) { where += ' AND d.caseId = ?'; params.push(caseId); }
    if (search) {
      where += ' AND (d.title LIKE ? OR d.originalName LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const total = (await queryOne(
      `SELECT COUNT(*) as c FROM documents d JOIN cases c ON d.caseId = c.id ${where}`, params
    ))?.c || 0;

    const docs = (await queryAll(
      `SELECT d.id,d.title,d.fileName,d.originalName,d.filePath,d.fileSize,d.mimeType,d.category,d.caseId,d.cloudUrl,d.cloudPublicId,d.thumbnailUrl,d.createdAt,
              c.caseNumber,c.caseTitle
       FROM documents d JOIN cases c ON d.caseId = c.id ${where} ORDER BY d.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, lim, skip]
    )).map(d => {
      d._id = d.id;
      d.fileUrl = d.cloudUrl || d.filePath || null;
      return d;
    });

    res.json({ success: true, data: docs, pagination: paginateResults(total, pg, lim) });
  } catch (error) {
    console.error('Client documents error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/documents/:id/download-url', clientAuth, async (req, res) => {
  try {
    const doc = await queryOne(
      `SELECT d.id,d.cloudUrl,d.cloudPublicId,d.filePath,d.originalName,d.mimeType,d.fileSize
       FROM documents d JOIN cases c ON d.caseId = c.id WHERE d.id = ? AND c.clientId = ?`,
      [req.params.id, req.client.id]
    );
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    const url = doc.cloudUrl || (doc.cloudPublicId && getCloudinaryConfigured() ? getCloudinaryUrl(doc.cloudPublicId) : null);
    if (!url) {
      return res.status(404).json({ success: false, message: 'Document URL not available' });
    }
    res.json({ success: true, data: { url, fileName: doc.originalName, mimeType: doc.mimeType, fileSize: doc.fileSize } });
  } catch (error) {
    console.error('Client document download URL error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== INVOICES ====================

router.get('/invoices', clientAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { page: pg, limit: lim, skip } = paginationHelper(page, limit);

    let where = 'WHERE clientId = ?';
    const params = [req.client.id];

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) { where += ' AND status = ?'; params.push(statuses[0]); }
      else if (statuses.length > 1) { where += ` AND status IN (${statuses.map(() => '?').join(',')})`; params.push(...statuses); }
    }

    const total = (await queryOne(`SELECT COUNT(*) as c FROM invoices ${where}`, params))?.c || 0;

    const invoices = (await queryAll(
      `SELECT * FROM invoices ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, lim, skip]
    )).map(i => parseInvoice(i));

    res.json({ success: true, data: invoices, pagination: paginateResults(total, pg, lim) });
  } catch (error) {
    console.error('Client invoices error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/invoices/:id', clientAuth, async (req, res) => {
  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ? AND clientId = ?', [req.params.id, req.client.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    let caseData = null;
    if (invoice.caseId) {
      const c = await queryOne('SELECT id,caseNumber,caseTitle FROM cases WHERE id = ?', [invoice.caseId]);
      if (c) { c._id = c.id; caseData = c; }
    }

    res.json({ success: true, data: { ...parseInvoice(invoice), case: caseData } });
  } catch (error) {
    console.error('Client invoice detail error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== NOTIFICATIONS ====================

router.get('/notifications', clientAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const { page: pg, limit: lim, skip } = paginationHelper(page, limit);

    let where = 'WHERE clientId = ?';
    const params = [req.client.id];

    if (isRead !== undefined) { where += ' AND isRead = ?'; params.push(isRead === 'true' ? 1 : 0); }

    const total = (await queryOne(`SELECT COUNT(*) as c FROM client_notifications ${where}`, params))?.c || 0;

    const notifications = (await queryAll(
      `SELECT * FROM client_notifications ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, lim, skip]
    )).map(n => ({ ...n, _id: n.id }));

    res.json({ success: true, data: notifications, pagination: paginateResults(total, pg, lim) });
  } catch (error) {
    console.error('Client notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/notifications/unread-count', clientAuth, async (req, res) => {
  try {
    const count = (await queryOne('SELECT COUNT(*) as c FROM client_notifications WHERE clientId = ? AND isRead = 0', [req.client.id]))?.c || 0;
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/notifications/:id/read', clientAuth, async (req, res) => {
  try {
    await getDb().execute('UPDATE client_notifications SET isRead = 1 WHERE id = ? AND clientId = ?', [req.params.id, req.client.id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/notifications/read-all', clientAuth, async (req, res) => {
  try {
    await getDb().execute('UPDATE client_notifications SET isRead = 1 WHERE clientId = ?', [req.client.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== MESSAGES ====================

router.get('/messages', clientAuth, async (req, res) => {
  try {
    const { withUser, caseId, page = 1, limit = 50 } = req.query;
    const { page: pg, limit: lim, skip } = paginationHelper(page, limit);

    let where = "WHERE (senderId = ? AND senderType = 'client') OR (receiverId = ? AND receiverType = 'client')";
    const params = [req.client.id, req.client.id];

    if (withUser) {
      where += " AND ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))";
      params.push(withUser, req.client.id, req.client.id, withUser);
    }
    if (caseId) { where += ' AND caseId = ?'; params.push(caseId); }

    const total = (await queryOne(`SELECT COUNT(*) as c FROM messages ${where}`, params))?.c || 0;

    const messages = (await queryAll(
      `SELECT * FROM messages ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, lim, skip]
    )).map(m => {
      const parsed = { ...m, _id: m.id };
      parsed.attachments = parseJson(m.attachments, []);
      return parsed;
    });

    res.json({ success: true, data: messages, pagination: paginateResults(total, pg, lim) });
  } catch (error) {
    console.error('Client messages error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/messages/conversations', clientAuth, async (req, res) => {
  try {
    const messages = await queryAll(
      `SELECT m.*,
        CASE WHEN m.senderType = 'client' THEN m.receiverId ELSE m.senderId END as otherUserId,
        CASE WHEN m.senderType = 'client' THEN m.receiverType ELSE m.senderType END as otherUserType
       FROM messages m
       WHERE (m.senderId = ? AND m.senderType = 'client') OR (m.receiverId = ? AND m.receiverType = 'client')
       ORDER BY m.createdAt DESC`,
      [req.client.id, req.client.id]
    );

    const convMap = {};
    for (const m of messages) {
      const key = m.otherUserId;
      if (!convMap[key]) {
        const user = m.otherUserType === 'advocate' || m.otherUserType === 'admin'
          ? await queryOne('SELECT id,name,avatar FROM users WHERE id = ?', [m.otherUserId])
          : await queryOne('SELECT id,name FROM clients WHERE id = ?', [m.otherUserId]);
        if (user) user._id = user.id;
        convMap[key] = {
          otherUser: user,
          lastMessage: { ...m, _id: m.id, attachments: parseJson(m.attachments, []) },
          unreadCount: 0,
        };
      }
      if (!m.isRead && m.receiverType === 'client') {
        convMap[key].unreadCount++;
      }
    }

    res.json({ success: true, data: Object.values(convMap) });
  } catch (error) {
    console.error('Client conversations error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/messages', clientAuth, [
  body('receiverId').trim().notEmpty(),
  body('text').trim().optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { receiverId, text, caseId, attachments } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const receiver = await queryOne('SELECT id FROM users WHERE id = ?', [receiverId]);
    const receiverType = receiver ? 'advocate' : 'client';

    await getDb().execute(
      `INSERT INTO messages (id, senderId, senderType, receiverId, receiverType, caseId, text, attachments, isRead, createdAt)
       VALUES (?, ?, 'client', ?, ?, ?, ?, ?, 0, ?)`,
      [id, req.client.id, receiverId, receiverType, caseId || null, text || null, JSON.stringify(attachments || []), now]
    );

    const message = await queryOne('SELECT * FROM messages WHERE id = ?', [id]);
    message._id = message.id;
    message.attachments = parseJson(message.attachments, []);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
});

router.put('/messages/read', clientAuth, async (req, res) => {
  try {
    const { senderId } = req.body;
    if (senderId) {
      await getDb().execute(
        "UPDATE messages SET isRead = 1 WHERE senderId = ? AND receiverId = ? AND receiverType = 'client' AND isRead = 0",
        [senderId, req.client.id]
      );
    }
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== APPOINTMENTS ====================

router.get('/appointments', clientAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const { page: pg, limit: lim, skip } = paginationHelper(page, limit);

    let where = 'WHERE a.clientId = ?';
    const params = [req.client.id];

    if (status) { where += ' AND a.status = ?'; params.push(status); }

    const total = (await queryOne(`SELECT COUNT(*) as c FROM appointments a ${where}`, params))?.c || 0;

    const appointments = (await queryAll(
      `SELECT a.*, u.name as advocateName, u.email as advocateEmail
       FROM appointments a JOIN users u ON a.advocateId = u.id ${where} ORDER BY a.requestedDate DESC LIMIT ? OFFSET ?`,
      [...params, lim, skip]
    )).map(a => ({ ...a, _id: a.id }));

    res.json({ success: true, data: appointments, pagination: paginateResults(total, pg, lim) });
  } catch (error) {
    console.error('Client appointments error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/appointments', clientAuth, [
  body('advocateId').trim().notEmpty(),
  body('meetingType').isIn(['office-visit', 'video-call', 'phone-call']),
  body('requestedDate').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { advocateId, caseId, meetingType, requestedDate, requestedTime, reason } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await getDb().execute(
      `INSERT INTO appointments (id, clientId, advocateId, caseId, meetingType, requestedDate, requestedTime, reason, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, req.client.id, advocateId, caseId || null, meetingType, requestedDate, requestedTime || null, reason || null, now, now]
    );

    const appointment = await queryOne(
      `SELECT a.*, u.name as advocateName FROM appointments a JOIN users u ON a.advocateId = u.id WHERE a.id = ?`, [id]
    );
    appointment._id = appointment.id;

    await getDb().execute(
      `INSERT INTO client_notifications (id, clientId, title, message, type, isRead, createdAt)
       VALUES (?, ?, ?, ?, 'appointment', 0, ?)`,
      [crypto.randomUUID(), req.client.id, 'Appointment Requested', `Meeting request sent to ${appointment.advocateName}`, now]
    );

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    console.error('Create appointment error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/appointments/:id/cancel', clientAuth, async (req, res) => {
  try {
    const appointment = await queryOne('SELECT * FROM appointments WHERE id = ? AND clientId = ?', [req.params.id, req.client.id]);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    if (appointment.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending appointments' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await getDb().execute("UPDATE appointments SET status = 'cancelled', updatedAt = ? WHERE id = ?", [now, req.params.id]);

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== PROFILE ====================

router.get('/profile', clientAuth, async (req, res) => {
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.client.id]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.json({ success: true, data: Client.sanitize(client) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile', clientAuth, [
  body('email').optional().isEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const allowedUpdates = ['email', 'address', 'emergencyContact', 'profilePhoto'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const updated = await Client.updateById(req.client.id, updates);
    res.json({ success: true, data: Client.sanitize(updated) });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
});

router.put('/profile/password', clientAuth, [
  body('currentPassword').trim().notEmpty(),
  body('newPassword').trim().isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.client.id]);

    if (!client.portalPassword) {
      return res.status(400).json({ success: false, message: 'No password set. Use forgot password to set one.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, client.portalPassword);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await getDb().execute('UPDATE clients SET portalPassword = ?, updatedAt = ? WHERE id = ?', [
      hashedPassword, new Date().toISOString(), req.client.id,
    ]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
