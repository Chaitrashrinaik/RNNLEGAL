const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, query, validationResult } = require('express-validator');
const crypto = require('crypto');
const { getDb, queryAll, queryOne, saveDb } = require('../config/db');
const Case = require('../models/Case');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { uploadDocument, handleUploadError, deleteFromCloudinary, getCloudinaryUrl, getCloudinaryConfigured } = require('../middleware/upload');
const Document = require('../models/Document');
const { paginationHelper, paginateResults, generateCaseNumber } = require('../utils/helpers');
const { logActivity, logFromRequest } = require('../utils/activityLogger');
const logger = require('../utils/logger');

function getDocumentUrl(doc) {
  if (doc.cloudUrl) return doc.cloudUrl;
  if (doc.cloudPublicId && getCloudinaryConfigured()) return getCloudinaryUrl(doc.cloudPublicId);
  if (doc.filePath) {
    let absPath = path.resolve(doc.filePath);
    if (!fs.existsSync(absPath)) {
      absPath = path.join(__dirname, '../../uploads/documents', path.basename(doc.filePath));
    }
    if (fs.existsSync(absPath)) {
      return `/api/documents/${doc.id}/file`;
    }
  }
  return null;
}

const router = express.Router();

router.use(auth);

function buildCaseQuery({ search, status, caseType, court, priority, caseOutcome, assignedOnly, userId, userRole }) {
  let where = 'WHERE 1=1';
  const params = [];



  if (search) {
    where += ' AND (c.caseNumber LIKE ? OR c.caseTitle LIKE ? OR c.oppositeParty LIKE ? OR c.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) { where += ' AND c.status = ?'; params.push(statuses[0]); }
    else if (statuses.length > 1) { where += ` AND c.status IN (${statuses.map(() => '?').join(',')})`; params.push(...statuses); }
  }
  if (caseOutcome) {
    const outcomes = caseOutcome.split(',').map(o => o.trim()).filter(Boolean);
    if (outcomes.length === 1) { where += ' AND c.caseOutcome = ?'; params.push(outcomes[0]); }
    else if (outcomes.length > 1) { where += ` AND c.caseOutcome IN (${outcomes.map(() => '?').join(',')})`; params.push(...outcomes); }
  }
  if (caseType) {
    const types = caseType.split(',').map(t => t.trim()).filter(Boolean);
    if (types.length === 1) { where += ' AND c.caseType = ?'; params.push(types[0]); }
    else if (types.length > 1) { where += ` AND c.caseType IN (${types.map(() => '?').join(',')})`; params.push(...types); }
  }
  if (court) {
    const courts = court.split(',').map(c => c.trim()).filter(Boolean);
    if (courts.length === 1) { where += ' AND c.court = ?'; params.push(courts[0]); }
    else if (courts.length > 1) { where += ` AND c.court IN (${courts.map(() => '?').join(',')})`; params.push(...courts); }
  }
  if (priority) {
    const priorities = priority.split(',').map(p => p.trim()).filter(Boolean);
    if (priorities.length === 1) { where += ' AND c.priority = ?'; params.push(priorities[0]); }
    else if (priorities.length > 1) { where += ` AND c.priority IN (${priorities.map(() => '?').join(',')})`; params.push(...priorities); }
  }

  if (assignedOnly === 'true' && userId) {
    where += ' AND c.id IN (SELECT caseId FROM case_advocates WHERE userId = ?)';
    params.push(userId);
  }

  return { where, params };
}

async function populateCases(cases) {
  if (cases.length === 0) return [];
  const caseIds = cases.map(c => c.id);
  const ph = caseIds.map(() => '?').join(',');

  const clientIds = [...new Set(cases.map(c => c.clientId).filter(Boolean))];
  const creatorIds = [...new Set(cases.map(c => c.createdBy).filter(Boolean))];

  let clients = [];
  let creators = [];
  let advocatesByCase = {};

  if (clientIds.length > 0) {
    const cph = clientIds.map(() => '?').join(',');
    clients = await queryAll(`SELECT id,name,email,phone,company,panNumber FROM clients WHERE id IN (${cph})`, clientIds);
  }
  if (creatorIds.length > 0) {
    const uph = creatorIds.map(() => '?').join(',');
    creators = await queryAll(`SELECT id,name,email FROM users WHERE id IN (${uph})`, creatorIds);
  }

  const advRows = await queryAll(
    `SELECT ca.caseId, u.id, u.name, u.email, u.role, u.phone, u.avatar, u.firmName
     FROM case_advocates ca JOIN users u ON ca.userId = u.id WHERE ca.caseId IN (${ph})`,
    caseIds
  );
  for (const a of advRows) {
    a._id = a.id;
    if (!advocatesByCase[a.caseId]) advocatesByCase[a.caseId] = [];
    advocatesByCase[a.caseId].push(a);
  }

  const clientMap = Object.fromEntries(clients.map(c => { c._id = c.id; return [c.id, c]; }));
  const creatorMap = Object.fromEntries(creators.map(c => { c._id = c.id; return [c.id, c]; }));

  return cases.map(c => {
    const parsed = Case.parseCase(c);
    return {
      ...parsed,
      client: clientMap[c.clientId] || null,
      assignedAdvocates: advocatesByCase[c.id] || [],
      createdBy: creatorMap[c.createdBy] || null,
    };
  });
}

async function populateCaseSingle(c) {
  if (!c) return null;
  const parsed = Case.parseCase(c);

  const client = c.clientId ? await queryOne('SELECT * FROM clients WHERE id = ?', [c.clientId]) : null;
  const creator = c.createdBy ? await queryOne('SELECT id,name,email FROM users WHERE id = ?', [c.createdBy]) : null;
  const advocates = await Case.getAdvocates(c.id);
  const rawDocs = await queryAll('SELECT * FROM documents WHERE caseId = ?', [c.id]);
  const docs = [];
  for (const d of rawDocs) {
    const parsedDoc = Document.parseDoc(d);
    const uploader = d.uploadedBy ? await queryOne('SELECT id,name,email FROM users WHERE id = ?', [d.uploadedBy]) : null;
    if (uploader) uploader._id = uploader.id;
    docs.push({ ...parsedDoc, uploadedBy: uploader, fileUrl: getDocumentUrl(d) });
  }

  const payments = await queryAll('SELECT p.*, u.name as recordedByName FROM payments p LEFT JOIN users u ON p.recordedBy = u.id WHERE p.caseId = ? ORDER BY p.paymentDate DESC', [c.id]);
  const caseUpdates = await queryAll('SELECT cu.*, u.name as addedByName FROM case_updates cu LEFT JOIN users u ON cu.addedBy = u.id WHERE cu.caseId = ? ORDER BY cu.createdAt DESC', [c.id]);
  const tasks = await queryAll('SELECT t.*, u.name as assigneeName FROM tasks t LEFT JOIN users u ON t.assignedTo = u.id WHERE t.caseId = ? ORDER BY CASE t.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 WHEN \'low\' THEN 4 END', [c.id]);

  if (client) { client._id = client.id; client.address = Case.parseJson(client.address, {}); }
  if (creator) creator._id = creator.id;

  let seniorAdvocate = null;
  if (c.seniorAdvocateId) {
    seniorAdvocate = await queryOne('SELECT id,name,email,role,phone,avatar,barCouncilNumber,advocateId FROM users WHERE id = ?', [c.seniorAdvocateId]);
    if (seniorAdvocate) seniorAdvocate._id = seniorAdvocate.id;
  }

  let juniorAdvocate = null;
  if (c.juniorAdvocateId) {
    juniorAdvocate = await queryOne('SELECT id,name,email,role,phone,avatar,barCouncilNumber,advocateId FROM users WHERE id = ?', [c.juniorAdvocateId]);
    if (juniorAdvocate) juniorAdvocate._id = juniorAdvocate.id;
  }

  let supportingAdvocates = [];
  try {
    const supIds = JSON.parse(c.supportingAdvocateIds || '[]');
    if (supIds.length > 0) {
      const placeholders = supIds.map(() => '?').join(',');
      supportingAdvocates = await queryAll(`SELECT id,name,email,role,phone,avatar,barCouncilNumber,advocateId FROM users WHERE id IN (${placeholders})`, supIds);
      supportingAdvocates = supportingAdvocates.map(a => { a._id = a.id; return a; });
    }
  } catch { supportingAdvocates = []; }

  const pendingTasks = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length;
  const overdueTasks = tasks.filter(t => (t.status === 'overdue' || (t.dueDate && t.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10))) && !['completed', 'cancelled'].includes(t.status)).length;

  return {
    ...parsed,
    client,
    assignedAdvocates: advocates,
    createdBy: creator,
    documents: docs,
    payments: payments.map(p => ({ ...p, _id: p.id })),
    caseUpdates: caseUpdates.map(u => ({ ...u, _id: u.id })),
    caseTasks: tasks.map(t => ({ ...t, _id: t.id })),
    seniorAdvocate,
    juniorAdvocate,
    supportingAdvocates,
    pendingTasks,
    overdueTasks,
  };
}

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['caseNumber', 'caseTitle', 'nextHearingDate', 'filingDate', 'createdAt', 'priority', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { page, limit, skip } = paginationHelper(req.query.page, req.query.limit);
      const { search, status, caseType, court, priority, caseOutcome, assignedOnly, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const { where, params } = buildCaseQuery({ search, status, caseType, court, priority, caseOutcome, assignedOnly, userId: req.user._id, userRole: req.user.role });

      const sortCol = `c.${sortBy}`;
      const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

      const countResult = await queryOne(`SELECT COUNT(*) as c FROM cases c ${where}`, params);
      const total = countResult?.c || 0;

      const cases = await queryAll(
        `SELECT c.* FROM cases c ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
        [...params, limit, skip]
      );

      const populated = await populateCases(cases);

      res.json({
        success: true,
        data: populated,
        pagination: paginateResults(total, page, limit),
      });
    } catch (error) {
      console.error('Get cases error:', error.message);
      res.status(500).json({ success: false, message: 'Server error fetching cases' });
    }
  }
);

router.get('/upcoming-hearings', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const cases = await queryAll(
      `SELECT c.* FROM cases c
       WHERE c.nextHearingDate >= ? AND c.nextHearingDate <= ?
       AND c.status IN ('active', 'in-progress', 'pending')
       ORDER BY c.nextHearingDate ASC`,
      [now, thirtyDays]
    );

    const populated = await populateCases(cases);
    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Get upcoming hearings error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const totalCasesResult = await queryOne('SELECT COUNT(*) as c FROM cases');
    const totalCases = totalCasesResult?.c || 0;
    const activeCasesResult = await queryOne("SELECT COUNT(*) as c FROM cases WHERE status IN ('active','in-progress')");
    const activeCases = activeCasesResult?.c || 0;
    const closedCasesResult = await queryOne("SELECT COUNT(*) as c FROM cases WHERE status IN ('closed','disposed')");
    const closedCases = closedCasesResult?.c || 0;
    const pendingCasesResult = await queryOne("SELECT COUNT(*) as c FROM cases WHERE status = 'pending'");
    const pendingCases = pendingCasesResult?.c || 0;
    const casesByType = await queryAll('SELECT caseType as _id, COUNT(*) as count FROM cases GROUP BY caseType ORDER BY count DESC');
    const casesByCourt = await queryAll('SELECT court as _id, COUNT(*) as count FROM cases GROUP BY court ORDER BY count DESC');
    const casesByStatus = await queryAll('SELECT status as _id, COUNT(*) as count FROM cases GROUP BY status');
    const casesByPriority = await queryAll('SELECT priority as _id, COUNT(*) as count FROM cases GROUP BY priority');

    res.json({
      success: true,
      data: { totalCases, activeCases, closedCases, pendingCases, casesByType, casesByCourt, casesByStatus, casesByPriority },
    });
  } catch (error) {
    console.error('Case statistics error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    res.json({ success: true, data: await populateCaseSingle(caseItem) });
  } catch (error) {
    console.error('Get case error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching case' });
  }
});

router.post(
  '/',
  checkPermission('cases', 'add'),
  [
    body('caseTitle').trim().notEmpty().withMessage('Case title is required'),
    body('caseType').trim().notEmpty().withMessage('Case type is required'),
    body('court').isIn(['district', 'high', 'supreme', 'nclt', 'drt', 'rera', 'consumer', 'other']),
    body('client').notEmpty().withMessage('Valid client ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const clientId = req.body.client;
      const client = await queryOne('SELECT * FROM clients WHERE id = ?', [clientId]);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      const caseNumber = req.body.caseNumber || generateCaseNumber(req.body.court, req.body.caseType);
      const existingCase = await queryOne('SELECT id FROM cases WHERE caseNumber = ?', [caseNumber]);
      if (existingCase) {
        return res.status(400).json({ success: false, message: 'Case number already exists' });
      }

      const caseData = {
        ...req.body,
        clientId: clientId,
        caseNumber,
        createdBy: req.user._id,
      };

      const created = await Case.create(caseData);

      if (req.body.assignedAdvocates && req.body.assignedAdvocates.length > 0) {
        await Case.setAdvocates(created.id, req.body.assignedAdvocates);

        for (const advocateId of req.body.assignedAdvocates) {
          await Notification.create({
            userId: advocateId,
            title: `New Case Assigned: ${created.caseNumber}`,
            message: `You have been assigned to case "${created.caseTitle}".`,
            type: 'system',
            caseId: created.id,
            link: `/cases/${created.id}`,
          });
        }
      }

      const populated = await populateCaseSingle(await queryOne('SELECT * FROM cases WHERE id = ?', [created.id]));
      res.status(201).json({ success: true, data: populated });

      logActivity({ userId: req.user._id, userName: req.user.name, action: 'case_created', entity: 'case', entityId: created.id, details: `Case ${created.caseNumber} created: ${created.caseTitle}`, ipAddress: req.ip });
    } catch (error) {
      console.error('Create case error:', error.message);
      res.status(500).json({ success: false, message: 'Server error creating case' });
    }
  }
);

router.put('/:id/outcome', checkPermission('cases', 'edit'), async (req, res) => {
  try {
    const { caseOutcome } = req.body;
    if (!caseOutcome || !['won', 'lost', 'settled', 'pending'].includes(caseOutcome)) {
      return res.status(400).json({ success: false, message: 'Invalid outcome. Must be: won, lost, settled, or pending' });
    }

    const existing = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (req.user.role === 'advocate') {
      const assigned = await queryOne('SELECT 1 FROM case_advocates WHERE caseId = ? AND userId = ?', [req.params.id, req.user._id]);
      if (!assigned) {
        return res.status(403).json({ success: false, message: 'You can only update cases assigned to you' });
      }
    }

    const updated = await Case.updateById(req.params.id, { caseOutcome, status: caseOutcome === 'won' || caseOutcome === 'lost' || caseOutcome === 'settled' ? 'closed' : existing.status });
    res.json({ success: true, data: updated, message: 'Case outcome updated' });
    logFromRequest(req, { action: 'case_outcome_updated', entity: 'case', entityId: req.params.id, caseId: req.params.id, module: 'Cases', details: `Case outcome updated to: ${req.body.caseOutcome}`, newValue: { caseOutcome: req.body.caseOutcome } });
  } catch (error) {
    console.error('Update case outcome error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', checkPermission('cases', 'edit'), async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (req.user.role === 'advocate') {
      const assigned = await queryOne('SELECT 1 FROM case_advocates WHERE caseId = ? AND userId = ?', [req.params.id, req.user._id]);
      if (!assigned) {
        return res.status(403).json({ success: false, message: 'You can only edit cases assigned to you' });
      }
    }

    const { assignedAdvocates, ...bodyUpdates } = req.body;
    if (bodyUpdates.client) {
      bodyUpdates.clientId = bodyUpdates.client;
      delete bodyUpdates.client;
    }

    const prevJuniorId = existing.juniorAdvocateId;
    let prevSupportingIds = [];
    try { prevSupportingIds = JSON.parse(existing.supportingAdvocateIds || '[]'); } catch { prevSupportingIds = []; }

    await Case.updateById(req.params.id, bodyUpdates);

    if (assignedAdvocates !== undefined) {
      await Case.setAdvocates(req.params.id, assignedAdvocates);
    }

    const newJuniorId = bodyUpdates.juniorAdvocateId !== undefined ? bodyUpdates.juniorAdvocateId : prevJuniorId;
    const newSupportingIds = bodyUpdates.supportingAdvocateIds || prevSupportingIds;

    const updated = await populateCaseSingle(await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]));
    res.json({ success: true, data: updated });

    logActivity({ userId: req.user._id, userName: req.user.name, action: 'case_updated', entity: 'case', entityId: req.params.id, details: `Case ${existing.caseNumber} updated`, ipAddress: req.ip });
  } catch (error) {
    console.error('Update case error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating case' });
  }
});

router.delete('/:id', authorize('admin', 'manager'), checkPermission('cases', 'delete'), async (req, res) => {
  try {
    const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    await Case.deleteById(req.params.id);
    res.json({ success: true, message: 'Case deleted successfully' });

    logActivity({ userId: req.user._id, userName: req.user.name, action: 'case_deleted', entity: 'case', entityId: req.params.id, details: `Case ${caseItem.caseNumber} deleted`, ipAddress: req.ip });
  } catch (error) {
    console.error('Delete case error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting case' });
  }
});

router.post(
  '/:id/hearings',
  [
    body('date').isISO8601().withMessage('Valid hearing date is required'),
    body('notes').optional().trim(),
    body('outcome').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
      if (!caseItem) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      const { v4: uuidv4 } = require('uuid');
      const hearingId = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const hearingHistory = JSON.parse(caseItem.hearingHistory || '[]');
      hearingHistory.push({
        id: hearingId,
        date: req.body.date,
        notes: req.body.notes || '',
        outcome: req.body.outcome || '',
        arguments: req.body.arguments || '',
        documentsSubmitted: req.body.documentsSubmitted || '',
        judgeRemarks: req.body.judgeRemarks || '',
        nextSteps: req.body.nextSteps || '',
        courtDirections: req.body.courtDirections || '',
        orderPassed: req.body.orderPassed || '',
        nextHearingDate: req.body.nextHearingDate || null,
      });

      const updates = { hearingHistory, lastHearingDate: req.body.date };
      if (req.body.nextHearingDate) updates.nextHearingDate = req.body.nextHearingDate;

      await Case.updateById(req.params.id, updates);

      const hearingDateFormatted = new Date(req.body.date).toISOString().slice(0, 19).replace('T', ' ');

      const notesParts = [];
      if (req.body.notes) notesParts.push(req.body.notes);
      if (req.body.arguments) notesParts.push('Arguments: ' + req.body.arguments);
      if (req.body.documentsSubmitted) notesParts.push('Documents: ' + req.body.documentsSubmitted);
      if (req.body.judgeRemarks) notesParts.push('Judge Remarks: ' + req.body.judgeRemarks);
      if (req.body.nextSteps) notesParts.push('Next Steps: ' + req.body.nextSteps);
      const combinedNotes = notesParts.join('\n') || null;

      let hearingStatus = 'scheduled';
      if (req.body.outcome) hearingStatus = 'completed';

      await getDb().execute(
        `INSERT INTO hearings (id, caseId, hearingDate, court, courtName, courtHall, judgeName, notes, status, outcome, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [hearingId, req.params.id, hearingDateFormatted, caseItem.court || null, caseItem.courtName || null, null, caseItem.judgeName || null, combinedNotes, hearingStatus, req.body.outcome || null, req.user._id, now, now]
      );

      if (req.body.nextHearingDate) {
        await getDb().execute('UPDATE cases SET nextHearingDate = ?, updatedAt = ? WHERE id = ?',
          [new Date(req.body.nextHearingDate).toISOString().slice(0, 19).replace('T', ' '), now, req.params.id]);
      }

      const updated = await populateCaseSingle(await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]));
      res.json({ success: true, data: updated });
      logFromRequest(req, { action: 'hearing_added_to_case', entity: 'case', entityId: req.params.id, caseId: req.params.id, module: 'Cases', details: 'Hearing added to case' });
    } catch (error) {
      console.error('Add hearing error:', error.message);
      res.status(500).json({ success: false, message: 'Server error adding hearing' });
    }
  }
);

router.put(
  '/:id/hearings/:hearingIndex',
  async (req, res) => {
    try {
      const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
      if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

      const hearingHistory = JSON.parse(caseItem.hearingHistory || '[]');
      const ref = req.params.hearingIndex;
      let idx = hearingHistory.findIndex(h => h.id === ref);
      if (idx === -1) {
        const idxNum = parseInt(ref);
        if (idxNum >= 0 && idxNum < hearingHistory.length) idx = idxNum;
      }
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Hearing not found' });
      }

      const { notes, outcome, arguments: courtArguments, documentsSubmitted, judgeRemarks, nextSteps, nextHearingDate } = req.body;
      if (notes !== undefined) hearingHistory[idx].notes = notes;
      if (outcome !== undefined) hearingHistory[idx].outcome = outcome;
      if (courtArguments !== undefined) hearingHistory[idx].arguments = courtArguments;
      if (documentsSubmitted !== undefined) hearingHistory[idx].documentsSubmitted = documentsSubmitted;
      if (judgeRemarks !== undefined) hearingHistory[idx].judgeRemarks = judgeRemarks;
      if (nextSteps !== undefined) hearingHistory[idx].nextSteps = nextSteps;
      if (nextHearingDate !== undefined) hearingHistory[idx].nextHearingDate = nextHearingDate;

      await Case.updateById(req.params.id, { hearingHistory });
      const updated = await populateCaseSingle(await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]));
      res.json({ success: true, data: updated });
      logFromRequest(req, { action: 'case_hearing_updated', entity: 'case', entityId: req.params.id, caseId: req.params.id, module: 'Cases', details: 'Hearing history entry updated' });
    } catch (error) {
      console.error('Update hearing error:', error.message);
      res.status(500).json({ success: false, message: 'Server error updating hearing' });
    }
  }
);

router.post(
  '/:id/orders',
  [
    body('date').isISO8601().withMessage('Valid order date is required'),
    body('description').trim().notEmpty().withMessage('Order description is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
      if (!caseItem) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      const orders = JSON.parse(caseItem.orders || '[]');
      orders.push({
        date: req.body.date,
        description: req.body.description,
        document: req.body.document || null,
      });

      await Case.updateById(req.params.id, { orders });

      const updated = await populateCaseSingle(await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]));
      res.json({ success: true, data: updated });
      logFromRequest(req, { action: 'court_order_added', entity: 'case', entityId: req.params.id, caseId: req.params.id, module: 'Cases', details: 'Court order added to case' });
    } catch (error) {
      console.error('Add order error:', error.message);
      res.status(500).json({ success: false, message: 'Server error adding order' });
    }
  }
);

router.get('/:id/timeline', async (req, res) => {
  try {
    const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const parsed = Case.parseCase(caseItem);
    const timeline = [];

    timeline.push({
      type: 'case-created',
      date: parsed.createdAt,
      title: 'Case Filed',
      description: `Case ${parsed.caseNumber} was created`,
    });

    if (parsed.filingDate) {
      timeline.push({
        type: 'filing',
        date: parsed.filingDate,
        title: 'Case Filed in Court',
        description: `Case filed in ${parsed.courtName || parsed.court}`,
      });
    }

    for (const hearing of parsed.hearingHistory) {
      timeline.push({
        type: 'hearing',
        date: hearing.date,
        title: 'Hearing Conducted',
        description: hearing.notes || 'No notes',
        outcome: hearing.outcome,
      });
    }

    for (const order of parsed.orders) {
      timeline.push({
        type: 'order',
        date: order.date,
        title: 'Court Order',
        description: order.description,
      });
    }

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('Get timeline error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching timeline' });
  }
});

router.post(
  '/:id/documents',
  uploadDocument,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
      if (!caseItem) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      const cloudUrl = req.file.path || req.file.url || null;
      const cloudPublicId = req.file.filename || req.file.public_id || null;

      const document = await Document.create({
        title: req.file.originalname,
        fileName: cloudPublicId || req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path || cloudUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        caseId: req.params.id,
        uploadedBy: req.user._id,
        category: req.body.category || 'other',
        tags: [],
        accessLevel: 'team',
        cloudUrl,
        cloudPublicId,
        versions: [
          {
            version: 1,
            uploadedBy: req.user._id,
            filePath: cloudUrl || req.file.path,
            originalName: req.file.originalname,
            fileSize: req.file.size,
            cloudUrl,
            cloudPublicId,
          },
        ],
      });

      res.status(201).json({ success: true, data: document });
      logFromRequest(req, { action: 'document_uploaded_to_case', entity: 'case', entityId: req.params.id, caseId: req.params.id, module: 'Cases', details: `Document uploaded: ${req.file?.originalname || 'document'}` });
    } catch (error) {
      console.error('Upload case document error:', error.message);
      res.status(500).json({ success: false, message: 'Server error uploading document' });
    }
  }
);

router.post(
  '/:id/notes',
  [body('text').trim().notEmpty().withMessage('Note text is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
      if (!caseItem) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      const notes = JSON.parse(caseItem.notes || '[]');
      notes.push({
        _id: crypto.randomUUID(),
        text: req.body.text,
        author: req.user.name || req.user.email,
        date: new Date().toISOString(),
      });

      await Case.updateById(req.params.id, { notes });

      const updated = await populateCaseSingle(await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]));
      res.json({ success: true, data: updated });
      logFromRequest(req, { action: 'case_note_added', entity: 'case', entityId: req.params.id, caseId: req.params.id, module: 'Cases', details: 'Note added to case' });
    } catch (error) {
      console.error('Add note error:', error.message);
      res.status(500).json({ success: false, message: 'Server error adding note' });
    }
  }
);

module.exports = router;
