const express = require('express');
const { queryAll, queryOne } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { userId, advocateId, action, entity, module, caseId, search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];

    if (userId) { where += ' AND al.userId = ?'; params.push(userId); }
    if (advocateId) { where += ' AND al.advocateId = ?'; params.push(advocateId); }
    if (action) { where += ' AND al.action = ?'; params.push(action); }
    if (entity) { where += ' AND al.entity = ?'; params.push(entity); }
    if (module) { where += ' AND al.module = ?'; params.push(module); }
    if (caseId) { where += ' AND al.caseId = ?'; params.push(caseId); }
    if (startDate) { where += ' AND al.createdAt >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND al.createdAt <= ?'; params.push(endDate); }
    if (search) {
      where += ' AND (al.userName LIKE ? OR al.advocateId LIKE ? OR al.action LIKE ? OR al.entity LIKE ? OR al.details LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const countSql = `SELECT COUNT(*) as total FROM activity_logs al ${where}`;
    const total = (await queryOne(countSql, params))?.total || 0;

    const sql = `SELECT al.* FROM activity_logs al ${where} ORDER BY al.createdAt DESC LIMIT ? OFFSET ?`;
    const logs = await queryAll(sql, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: logs.map(l => {
        let parsedOld = null, parsedNew = null;
        try { if (l.oldValue) parsedOld = JSON.parse(l.oldValue); } catch { parsedOld = l.oldValue; }
        try { if (l.newValue) parsedNew = JSON.parse(l.newValue); } catch { parsedNew = l.newValue; }
        return {
          ...l,
          _id: l.id,
          oldValue: parsedOld,
          newValue: parsedNew,
          createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
        };
      }),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get activity logs error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching activity logs' });
  }
});

router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { limit = 50 } = req.query;
    const logs = await queryAll(
      `SELECT al.* FROM activity_logs al WHERE al.caseId = ? ORDER BY al.createdAt DESC LIMIT ?`,
      [caseId, parseInt(limit)]
    );
    res.json({
      success: true,
      data: logs.map(l => {
        let parsedOld = null, parsedNew = null;
        try { if (l.oldValue) parsedOld = JSON.parse(l.oldValue); } catch { parsedOld = l.oldValue; }
        try { if (l.newValue) parsedNew = JSON.parse(l.newValue); } catch { parsedNew = l.newValue; }
        return { ...l, _id: l.id, oldValue: parsedOld, newValue: parsedNew, createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null };
      }),
    });
  } catch (error) {
    console.error('Get case activity logs error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/advocate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = (await queryOne('SELECT COUNT(*) as c FROM activity_logs WHERE userId = ?', [userId]))?.c || 0;
    const logs = await queryAll(
      `SELECT al.* FROM activity_logs al WHERE al.userId = ? ORDER BY al.createdAt DESC LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );
    res.json({
      success: true,
      data: logs.map(l => {
        let parsedOld = null, parsedNew = null;
        try { if (l.oldValue) parsedOld = JSON.parse(l.oldValue); } catch { parsedOld = l.oldValue; }
        try { if (l.newValue) parsedNew = JSON.parse(l.newValue); } catch { parsedNew = l.newValue; }
        return { ...l, _id: l.id, oldValue: parsedOld, newValue: parsedNew, createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null };
      }),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get advocate activity logs error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/actions', async (req, res) => {
  try {
    const actions = await queryAll('SELECT DISTINCT action FROM activity_logs WHERE action IS NOT NULL ORDER BY action');
    const entities = await queryAll('SELECT DISTINCT entity FROM activity_logs WHERE entity IS NOT NULL ORDER BY entity');
    const modules = await queryAll('SELECT DISTINCT module FROM activity_logs WHERE module IS NOT NULL ORDER BY module');
    res.json({
      success: true,
      data: {
        actions: actions.map(a => a.action),
        entities: entities.map(e => e.entity),
        modules: modules.map(m => m.module),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
