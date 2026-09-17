const express = require('express');
const { queryAll, queryOne } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

async function getClientIdFromUser(userId) {
  const user = await queryOne('SELECT email FROM users WHERE id = ?', [userId]);
  if (!user) return null;
  const client = await queryOne('SELECT id FROM clients WHERE email = ?', [user.email]);
  return client ? client.id : null;
}

router.get('/dashboard', async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Client access only' });
    }
    const clientId = await getClientIdFromUser(req.user._id);
    if (!clientId) {
      return res.json({
        success: true,
        data: {
          totalCases: 0, activeCases: 0, pendingCases: 0, closedCases: 0,
          upcomingHearings: 0, recentCases: [], upcomingHearingList: [],
          pendingInvoices: 0, overdueInvoices: 0, totalDocuments: 0,
        },
      });
    }

    const now = new Date().toISOString();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const totalCasesR = await queryOne('SELECT COUNT(*) as c FROM cases WHERE clientId = ?', [clientId]);
    const activeCasesR = await queryOne("SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND status IN ('active','in-progress')", [clientId]);
    const pendingCasesR = await queryOne("SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND status = 'pending'", [clientId]);
    const closedCasesR = await queryOne("SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND status IN ('closed','disposed')", [clientId]);
    const upcomingHearingsR = await queryOne(
      "SELECT COUNT(*) as c FROM cases WHERE clientId = ? AND nextHearingDate >= ? AND nextHearingDate <= ? AND status IN ('active','in-progress','pending')",
      [clientId, now, thirtyDays]
    );

    const casesRaw = await queryAll(
      'SELECT * FROM cases WHERE clientId = ? ORDER BY createdAt DESC LIMIT 10',
      [clientId]
    );
    const recentCases = [];
    for (const c of casesRaw) {
      const advocates = await queryAll(
        'SELECT u.id,u.name FROM case_advocates ca JOIN users u ON ca.userId = u.id WHERE ca.caseId = ?',
        [c.id]
      );
      recentCases.push({
        id: c.id, caseNumber: c.caseNumber, caseTitle: c.caseTitle,
        status: c.status, priority: c.priority, nextHearingDate: c.nextHearingDate,
        courtName: c.courtName, judgeName: c.judgeName,
        assignedAdvocates: advocates.map(a => ({ id: a.id, name: a.name })),
      });
    }

    const upcomingHearingList = await queryAll(
      `SELECT c.id, c.caseNumber, c.caseTitle, c.nextHearingDate, c.courtName, c.judgeName, c.priority, c.status
       FROM cases c WHERE c.clientId = ? AND c.nextHearingDate >= ? AND c.nextHearingDate <= ?
       AND c.status IN ('active','in-progress','pending') ORDER BY c.nextHearingDate ASC LIMIT 5`,
      [clientId, now, thirtyDays]
    );

    const pendingInvoicesR = await queryOne("SELECT COUNT(*) as c FROM invoices WHERE clientId = ? AND status IN ('draft','sent')", [clientId]);
    const overdueInvoicesR = await queryOne("SELECT COUNT(*) as c FROM invoices WHERE clientId = ? AND status = 'overdue'", [clientId]);
    const totalDocumentsR = await queryOne(
      `SELECT COUNT(*) as c FROM documents d JOIN cases c ON d.caseId = c.id WHERE c.clientId = ?`,
      [clientId]
    );

    res.json({
      success: true,
      data: {
        totalCases: totalCasesR?.c || 0,
        activeCases: activeCasesR?.c || 0,
        pendingCases: pendingCasesR?.c || 0,
        closedCases: closedCasesR?.c || 0,
        upcomingHearings: upcomingHearingsR?.c || 0,
        recentCases,
        upcomingHearingList,
        pendingInvoices: pendingInvoicesR?.c || 0,
        overdueInvoices: overdueInvoicesR?.c || 0,
        totalDocuments: totalDocumentsR?.c || 0,
      },
    });
  } catch (error) {
    console.error('Client dashboard error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/cases', async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Client access only' });
    }
    const clientId = await getClientIdFromUser(req.user._id);
    if (!clientId) return res.json({ success: true, data: [] });

    const cases = await queryAll(
      'SELECT * FROM cases WHERE clientId = ? ORDER BY createdAt DESC',
      [clientId]
    );
    const result = [];
    for (const c of cases) {
      const advocates = await queryAll(
        'SELECT u.id,u.name FROM case_advocates ca JOIN users u ON ca.userId = u.id WHERE ca.caseId = ?',
        [c.id]
      );
      const docsCountR = await queryOne('SELECT COUNT(*) as c FROM documents WHERE caseId = ?', [c.id]);
      result.push({
        id: c.id, caseNumber: c.caseNumber, caseTitle: c.caseTitle,
        caseType: c.caseType, court: c.court, courtName: c.courtName,
        judgeName: c.judgeName, status: c.status, priority: c.priority,
        filingDate: c.filingDate, nextHearingDate: c.nextHearingDate,
        lastHearingDate: c.lastHearingDate, description: c.description,
        oppositeParty: c.oppositeParty, oppositePartyLawyer: c.oppositePartyLawyer,
        orders: JSON.parse(c.orders || '[]'),
        hearingHistory: JSON.parse(c.hearingHistory || '[]'),
        tags: JSON.parse(c.tags || '[]'),
        assignedAdvocates: advocates.map(a => ({ id: a.id, name: a.name })),
        documentsCount: docsCountR?.c || 0,
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Client cases error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Client access only' });
    }
    const clientId = await getClientIdFromUser(req.user._id);
    if (!clientId) return res.json({ success: true, data: [] });

    const invoices = await queryAll(
      'SELECT * FROM invoices WHERE clientId = ? ORDER BY createdAt DESC',
      [clientId]
    );
    const result = [];
    for (const inv of invoices) {
      const caseItem = inv.caseId ? await queryOne('SELECT id,caseNumber,caseTitle FROM cases WHERE id = ?', [inv.caseId]) : null;
      result.push({
        ...inv,
        items: JSON.parse(inv.items || '[]'),
        case: caseItem,
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Client invoices error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/documents', async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Client access only' });
    }
    const clientId = await getClientIdFromUser(req.user._id);
    if (!clientId) return res.json({ success: true, data: [] });

    const docs = await queryAll(
      `SELECT d.* FROM documents d JOIN cases c ON d.caseId = c.id WHERE c.clientId = ? ORDER BY d.createdAt DESC`,
      [clientId]
    );
    const result = docs.map(d => ({
      ...d,
      tags: JSON.parse(d.tags || '[]'),
      versions: JSON.parse(d.versions || '[]'),
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Client documents error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
