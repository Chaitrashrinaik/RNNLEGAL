const express = require('express');
const { queryAll, queryOne } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/stats', async (req, res) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString().slice(0, 19).replace('T', ' ');
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const isAdvocate = req.user.role === 'advocate';
    const isClient = req.user.role === 'client';
    const userId = req.user._id;

    let caseWhere = '';
    let caseParams = [];
    if (isClient) {
      caseWhere = 'WHERE c.clientId = ?';
      caseParams = [userId];
    } else {
      caseWhere = 'WHERE 1=1';
    }

    const totalCases = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${caseWhere}`, caseParams))?.c || 0;
    const activeCases = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.status IN ('active','in-progress')`, caseParams))?.c || 0;
    const pendingCases = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.status = 'pending'`, caseParams))?.c || 0;
    const closedCases = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.status IN ('closed','disposed')`, caseParams))?.c || 0;
    const wonCases = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.caseOutcome = 'won'`, caseParams))?.c || 0;
    const lostCases = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.caseOutcome = 'lost'`, caseParams))?.c || 0;
    const draftCases = (await queryOne(`SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.status = 'draft'`, caseParams))?.c || 0;

    const totalClients = (await queryOne('SELECT COUNT(*) as c FROM clients'))?.c || 0;
    const totalAdvocates = (await queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'advocate' AND isActive = 1"))?.c || 0;

    const upcomingHearings = (await queryOne(
      `SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.nextHearingDate >= ? AND c.nextHearingDate <= ? AND c.status NOT IN ('closed','disposed') AND (c.caseOutcome IS NULL OR c.caseOutcome = '')`,
      [...caseParams, now, thirtyDays]
    ))?.c || 0;

    const todayHearings = (await queryOne(
      `SELECT COUNT(*) as c FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.nextHearingDate >= ? AND c.nextHearingDate <= ?`,
      [...caseParams, todayStart, todayEnd]
    ))?.c || 0;

    const pendingInvoices = (await queryOne("SELECT COUNT(*) as c FROM invoices WHERE status IN ('draft','sent')"))?.c || 0;
    const overdueInvoices = (await queryOne("SELECT COUNT(*) as c FROM invoices WHERE status = 'overdue'"))?.c || 0;

    const monthlyRevenueR = await queryOne("SELECT COALESCE(SUM(total), 0) as r FROM invoices WHERE status = 'paid' AND MONTH(paidDate) = MONTH(NOW()) AND YEAR(paidDate) = YEAR(NOW())");
    const monthlyRevenue = monthlyRevenueR?.r || 0;
    const yearlyRevenueR = await queryOne("SELECT COALESCE(SUM(total), 0) as r FROM invoices WHERE status = 'paid' AND YEAR(paidDate) = YEAR(NOW())");
    const yearlyRevenue = yearlyRevenueR?.r || 0;

    const unreadNotifications = (await queryOne('SELECT COUNT(*) as c FROM notifications WHERE userId = ? AND isRead = 0', [userId]))?.c || 0;

    const paymentsPendingR = await queryOne(`SELECT COALESCE(SUM(c.amountPending), 0) as r FROM cases c ${caseWhere}`, caseParams);
    const paymentsPending = paymentsPendingR?.r || 0;

    const overdueTasksR = await queryOne(`SELECT COUNT(*) as c FROM tasks t WHERE t.status NOT IN ('completed','cancelled') AND t.dueDate IS NOT NULL AND t.dueDate < ?`, [now]);
    const overdueTasks = overdueTasksR?.c || 0;

    const pendingTasksR = await queryOne(`SELECT COUNT(*) as c FROM tasks t WHERE t.status NOT IN ('completed','cancelled')`);
    const pendingTasks = pendingTasksR?.c || 0;

    const casesByStatus = await queryAll(
      `SELECT c.status as _id, COUNT(*) as count FROM cases c ${caseWhere} GROUP BY c.status`,
      caseParams
    );

    const casesByType = await queryAll(
      `SELECT c.caseType as _id, COUNT(*) as count FROM cases c ${caseWhere} GROUP BY c.caseType`,
      caseParams
    );

    let recentCasesRaw;
    if (isClient) {
      recentCasesRaw = await queryAll(
        'SELECT * FROM cases WHERE clientId = ? ORDER BY createdAt DESC LIMIT 5',
        [userId]
      );
    } else {
      recentCasesRaw = await queryAll('SELECT * FROM cases ORDER BY createdAt DESC LIMIT 5');
    }

    const recentCases = [];
    for (const c of recentCasesRaw) {
      const client = c.clientId ? await queryOne('SELECT id,name FROM clients WHERE id = ?', [c.clientId]) : null;
      const advocates = await queryAll(
        `SELECT u.id,u.name FROM case_advocates ca JOIN users u ON ca.userId = u.id WHERE ca.caseId = ?`,
        [c.id]
      );
      if (client) client._id = client.id;
      recentCases.push({
        id: c.id, _id: c.id, caseNumber: c.caseNumber, caseTitle: c.caseTitle, status: c.status,
        client, assignedAdvocates: advocates.map(a => { a._id = a.id; return a; }),
      });
    }

    const upcomingHearingCases = (await queryAll(
      `SELECT c.* FROM cases c ${caseWhere} ${caseWhere === 'WHERE 1=1' ? 'AND' : 'AND'} c.nextHearingDate >= ? AND c.nextHearingDate <= ? AND c.status NOT IN ('closed','disposed') AND (c.caseOutcome IS NULL OR c.caseOutcome = '') ORDER BY c.nextHearingDate ASC LIMIT 5`,
      [...caseParams, now, thirtyDays]
    )).map(c => {
      const parsed = { ...c, _id: c.id };
      return parsed;
    });

    res.json({
      success: true,
      data: {
        totalCases, activeCases, pendingCases, closedCases, wonCases, lostCases, draftCases,
        totalClients, totalAdvocates, upcomingHearings, todayHearings,
        pendingInvoices, overdueInvoices, monthlyRevenue, yearlyRevenue,
        unreadNotifications, casesByStatus, casesByType,
        recentCases, upcomingHearingCases, paymentsPending, overdueTasks, pendingTasks,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard stats' });
  }
});

router.get('/hearing-calendar', async (req, res) => {
  try {
    const { start, end } = req.query;
    const isAdvocate = req.user.role === 'advocate';
    const isClient = req.user.role === 'client';
    const userId = req.user._id;

    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start).toISOString().slice(0, 19).replace('T', ' ');
      endDate = new Date(end).toISOString().slice(0, 19).replace('T', ' ');
    } else {
      startDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    }

    let casesRaw;
    if (isClient) {
      casesRaw = await queryAll(
        `SELECT c.* FROM cases c
         WHERE c.clientId = ? AND c.nextHearingDate IS NOT NULL AND c.nextHearingDate >= ? AND c.nextHearingDate <= ?
         AND c.status NOT IN ('closed','disposed') AND (c.caseOutcome IS NULL OR c.caseOutcome = '')
         ORDER BY c.nextHearingDate ASC`,
        [userId, startDate, endDate]
      );
    } else {
      casesRaw = await queryAll(
        `SELECT c.* FROM cases c
         WHERE c.nextHearingDate IS NOT NULL AND c.nextHearingDate >= ? AND c.nextHearingDate <= ?
         AND c.status NOT IN ('closed','disposed') AND (c.caseOutcome IS NULL OR c.caseOutcome = '')
         ORDER BY c.nextHearingDate ASC`,
        [startDate, endDate]
      );
    }

    const hearings = [];
    for (const c of casesRaw) {
      const client = c.clientId ? await queryOne('SELECT id,name,phone FROM clients WHERE id = ?', [c.clientId]) : null;
      const advocates = await queryAll(
        `SELECT u.id,u.name,u.email FROM case_advocates ca JOIN users u ON ca.userId = u.id WHERE ca.caseId = ?`,
        [c.id]
      );
      if (client) client._id = client.id;
      hearings.push({
        id: c.id, _id: c.id, caseNumber: c.caseNumber, caseTitle: c.caseTitle,
        court: c.court, courtName: c.courtName, judgeName: c.judgeName,
        nextHearingDate: c.nextHearingDate, priority: c.priority, status: c.status,
        client, assignedAdvocates: advocates.map(a => { a._id = a.id; return a; }),
      });
    }

    res.json({ success: true, data: hearings });
  } catch (error) {
    console.error('Hearing calendar error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching calendar' });
  }
});

router.get('/case-distribution', async (req, res) => {
  try {
    const byType = await queryAll('SELECT caseType as _id, COUNT(*) as count FROM cases GROUP BY caseType ORDER BY count DESC');
    const byCourt = await queryAll('SELECT court as _id, COUNT(*) as count FROM cases GROUP BY court ORDER BY count DESC');
    const byStatus = await queryAll('SELECT status as _id, COUNT(*) as count FROM cases GROUP BY status');
    const byPriority = await queryAll('SELECT priority as _id, COUNT(*) as count FROM cases GROUP BY priority');
    const monthlyFilingsRaw = await queryAll(
      `SELECT YEAR(createdAt) as year, MONTH(createdAt) as month, COUNT(*) as count
       FROM cases GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 12`
    );
    const monthlyFilings = monthlyFilingsRaw.map(r => ({ _id: { year: parseInt(r.year), month: parseInt(r.month) }, count: r.count }));

    const monthlyRevenueRaw = await queryAll(
      `SELECT YEAR(paidDate) as year, MONTH(paidDate) as month, SUM(total) as revenue
       FROM invoices WHERE status = 'paid' AND paidDate IS NOT NULL
       GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 12`
    );

    res.json({
      success: true,
      data: { byType, byCourt, byStatus, byPriority, monthlyFilings, monthlyRevenue: monthlyRevenueRaw },
    });
  } catch (error) {
    console.error('Case distribution error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
