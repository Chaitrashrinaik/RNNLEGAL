const express = require('express');
const { queryAll } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { q, type, limit = 10 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { cases: [], clients: [], documents: [], invoices: [] } });
    }

    const searchTerm = `%${q.trim()}%`;
    const lim = Math.min(parseInt(limit), 50);
    const results = { cases: [], clients: [], documents: [], invoices: [] };

    if (!type || type === 'cases') {
      results.cases = await queryAll(
        `SELECT id, caseNumber, caseTitle, status, caseType, court, courtName, priority, nextHearingDate, createdAt
         FROM cases WHERE caseNumber LIKE ? OR caseTitle LIKE ? OR courtName LIKE ? OR judgeName LIKE ?
         ORDER BY createdAt DESC LIMIT ?`,
        [searchTerm, searchTerm, searchTerm, searchTerm, lim]
      );
      results.cases = results.cases.map(c => ({ ...c, _id: c.id, type: 'case' }));
    }

    if (!type || type === 'clients') {
      results.clients = await queryAll(
        `SELECT id, name, email, phone, company FROM clients
         WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?
         ORDER BY name ASC LIMIT ?`,
        [searchTerm, searchTerm, searchTerm, searchTerm, lim]
      );
      results.clients = results.clients.map(c => ({ ...c, _id: c.id, type: 'client' }));
    }

    if (!type || type === 'documents') {
      results.documents = await queryAll(
        `SELECT d.id, d.title, d.originalName, d.category, d.caseId, c.caseNumber, c.caseTitle
         FROM documents d LEFT JOIN cases c ON d.caseId = c.id
         WHERE d.title LIKE ? OR d.originalName LIKE ? OR d.category LIKE ?
         ORDER BY d.createdAt DESC LIMIT ?`,
        [searchTerm, searchTerm, searchTerm, lim]
      );
      results.documents = results.documents.map(d => ({ ...d, _id: d.id, type: 'document' }));
    }

    if (!type || type === 'invoices') {
      results.invoices = await queryAll(
        `SELECT i.id, i.invoiceNumber, i.total, i.status, i.dueDate, c.name as clientName
         FROM invoices i LEFT JOIN clients c ON i.clientId = c.id
         WHERE i.invoiceNumber LIKE ? OR c.name LIKE ?
         ORDER BY i.createdAt DESC LIMIT ?`,
        [searchTerm, searchTerm, lim]
      );
      results.invoices = results.invoices.map(i => ({ ...i, _id: i.id, type: 'invoice' }));
    }

    const totalResults = results.cases.length + results.clients.length + results.documents.length + results.invoices.length;

    res.json({ success: true, data: results, total: totalResults });
  } catch (error) {
    console.error('Global search error:', error.message);
    res.status(500).json({ success: false, message: 'Server error searching' });
  }
});

module.exports = router;
