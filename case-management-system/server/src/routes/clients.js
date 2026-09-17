const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, query, validationResult } = require('express-validator');
const { queryAll, queryOne } = require('../config/db');
const Client = require('../models/Client');
const { auth, authorize } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { paginationHelper, paginateResults } = require('../utils/helpers');
const { sendWelcomeEmail } = require('../services/emailService');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();

router.use(auth);

async function populateClients(clients) {
  if (clients.length === 0) return [];
  const clientIds = clients.map(c => c.id);

  const clientCases = await queryAll(
    `SELECT id,caseNumber,caseTitle,status,clientId FROM cases WHERE clientId IN (${clientIds.map(() => '?').join(',')})`,
    clientIds
  );
  const casesByClient = {};
  for (const c of clientCases) {
    c._id = c.id;
    if (!casesByClient[c.clientId]) casesByClient[c.clientId] = [];
    casesByClient[c.clientId].push({ id: c.id, _id: c.id, caseNumber: c.caseNumber, caseTitle: c.caseTitle, status: c.status });
  }

  const creatorIds = [...new Set(clients.map(c => c.createdBy).filter(Boolean))];
  let creators = [];
  if (creatorIds.length > 0) {
    creators = await queryAll(`SELECT id,name,email FROM users WHERE id IN (${creatorIds.map(() => '?').join(',')})`, creatorIds);
  }
  const creatorMap = Object.fromEntries(creators.map(c => { c._id = c.id; return [c.id, c]; }));

  return clients.map(c => ({
    ...Client.parseClient(c),
    cases: (casesByClient[c.id] || []).map(c => { c._id = c.id; return c; }),
    createdBy: creatorMap[c.createdBy] || null,
  }));
}

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['name', 'email', 'company', 'createdAt']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { page, limit, skip } = paginationHelper(req.query.page, req.query.limit);
      const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      let where = 'WHERE 1=1';
      const params = [];

      if (search) {
        where += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }

      const sortCol = sortBy;
      const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

      const countResult = await queryOne(`SELECT COUNT(*) as c FROM clients ${where}`, params);
      const total = countResult?.c || 0;

      const clients = await queryAll(
        `SELECT * FROM clients ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
        [...params, limit, skip]
      );

      res.json({
        success: true,
        data: await populateClients(clients),
        pagination: paginateResults(total, page, limit),
      });
    } catch (error) {
      console.error('Get clients error:', error.message, error.stack);
      res.status(500).json({ success: false, message: 'Server error fetching clients' });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const cases = await queryAll('SELECT * FROM cases WHERE clientId = ? ORDER BY createdAt DESC', [client.id]);
    const populatedCases = await Promise.all(cases.map(async c => {
      const parsed = require('../models/Case').parseCase(c);
      const advocates = await require('../models/Case').getAdvocates(c.id);
      return { ...parsed, assignedAdvocates: advocates };
    }));

    const creator = client.createdBy ? await queryOne('SELECT id,name,email FROM users WHERE id = ?', [client.createdBy]) : null;
    if (creator) creator._id = creator.id;

    const invoices = await queryAll('SELECT * FROM invoices WHERE clientId = ? ORDER BY createdAt DESC', [client.id]);

    res.json({ success: true, data: { ...Client.parseClient(client), cases: populatedCases, invoices, createdBy: creator } });
  } catch (error) {
    console.error('Get client error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching client' });
  }
});

router.post(
  '/',
  checkPermission('clients', 'add'),
  [
    body('name').trim().notEmpty().withMessage('Client name is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please enter a valid email address'),
    body('phone').trim().notEmpty().withMessage('Mobile number is required').isLength({ min: 10, max: 10 }).withMessage('Mobile number must contain exactly 10 digits').isNumeric().withMessage('Mobile number must contain only digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (req.body.email) {
        const existingClient = await Client.findByEmail(req.body.email);
        if (existingClient) {
          return res.status(400).json({ success: false, message: 'Client with this email already exists' });
        }
      }

      const clientData = { ...req.body, createdBy: req.user._id };
      if (clientData.portalPassword) {
        clientData.portalPassword = await bcrypt.hash(clientData.portalPassword, 12);
        clientData.portalEnabled = 1;
      }

      const client = await Client.create(clientData);
      res.status(201).json({ success: true, data: client });
      logFromRequest(req, { action: 'client_created', entity: 'client', entityId: client.id, module: 'Clients', details: `Client created: ${req.body.name}` });
    } catch (error) {
      console.error('Create client error:', error.message);
      res.status(500).json({ success: false, message: 'Server error creating client' });
    }
  }
);

router.put(
  '/:id',
  checkPermission('clients', 'edit'),
  [
    body('phone').optional().trim().notEmpty().withMessage('Mobile number cannot be empty').isLength({ min: 10, max: 10 }).withMessage('Mobile number must contain exactly 10 digits').isNumeric().withMessage('Mobile number must contain only digits'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please enter a valid email address'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      if (req.body.email && req.body.email !== client.email) {
        const existing = await queryOne('SELECT id FROM clients WHERE email = ? AND id != ?', [req.body.email.toLowerCase(), req.params.id]);
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already in use by another client' });
        }
      }

      const updated = await Client.updateById(req.params.id, req.body);
      const cases = await queryAll('SELECT id,caseNumber,caseTitle,status FROM cases WHERE clientId = ?', [updated.id]);

      res.json({ success: true, data: { ...updated, cases } });
      logFromRequest(req, { action: 'client_updated', entity: 'client', entityId: req.params.id, module: 'Clients', details: 'Client information updated' });
    } catch (error) {
      console.error('Update client error:', error.message);
      res.status(500).json({ success: false, message: 'Server error updating client' });
    }
  }
);

router.delete('/:id', authorize('admin', 'manager'), checkPermission('clients', 'delete'), async (req, res) => {
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const caseCountResult = await queryOne('SELECT COUNT(*) as c FROM cases WHERE clientId = ?', [client.id]);
    const caseCount = caseCountResult?.c || 0;
    if (caseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete client with active cases. Please close or reassign cases first.',
      });
    }

    await Client.deleteById(req.params.id);
    res.json({ success: true, message: 'Client deleted successfully' });
    logFromRequest(req, { action: 'client_deleted', entity: 'client', entityId: req.params.id, module: 'Clients', details: 'Client deleted' });
  } catch (error) {
    console.error('Delete client error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting client' });
  }
});

router.get('/:id/cases', async (req, res) => {
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const cases = await queryAll('SELECT * FROM cases WHERE clientId = ? ORDER BY createdAt DESC', [req.params.id]);
    const populated = await Promise.all(cases.map(async c => {
      const parsed = require('../models/Case').parseCase(c);
      const advocates = (await require('../models/Case').getAdvocates(c.id)).map(a => ({ id: a.id, _id: a.id, name: a.name, email: a.email }));
      return { ...parsed, assignedAdvocates: advocates };
    }));

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Get client cases error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/portal-access', authorize('admin', 'manager'), async (req, res) => {
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const tempPassword = req.body.password || crypto.randomBytes(12).toString('base64').slice(0, 12);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await Client.updateById(req.params.id, {
      portalEnabled: 1,
      portalPassword: hashedPassword,
    });

    await sendWelcomeEmail(client.email, client.name, tempPassword);

    res.json({
      success: true,
      message: 'Portal access enabled. Welcome email sent to client.',
      data: { email: client.email, password: tempPassword },
    });
    logFromRequest(req, { action: 'client_portal_access_granted', entity: 'client', entityId: req.params.id, module: 'Clients', details: 'Portal access enabled for client' });
  } catch (error) {
    console.error('Portal access error:', error.message);
    res.status(500).json({ success: false, message: 'Server error setting portal access' });
  }
});

module.exports = router;
