const express = require('express');
const { queryAll, queryOne } = require('../config/db');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { paginationHelper, paginateResults } = require('../utils/helpers');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = paginationHelper(req.query.page, req.query.limit);
    const { type, isRead } = req.query;

    let where = 'WHERE n.userId = ?';
    const params = [req.user._id];
    if (type) { where += ' AND n.type = ?'; params.push(type); }
    if (isRead !== undefined) { where += ' AND n.isRead = ?'; params.push(isRead === 'true' ? 1 : 0); }

    const countResult = await queryOne(`SELECT COUNT(*) as c FROM notifications n ${where}`, params);
    const total = countResult?.c || 0;

    const notifications = await queryAll(
      `SELECT n.* FROM notifications n ${where} ORDER BY n.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, skip]
    );

    const caseIds = [...new Set(notifications.map(n => n.caseId).filter(Boolean))];
    let cases = [];
    if (caseIds.length > 0) {
      cases = await queryAll(`SELECT id,caseNumber,caseTitle FROM cases WHERE id IN (${caseIds.map(() => '?').join(',')})`, caseIds);
    }
    const caseMap = Object.fromEntries(cases.map(c => { c._id = c.id; return [c.id, c]; }));

    const populated = notifications.map(n => ({
      ...Notification.parseNotif(n),
      case: caseMap[n.caseId] || null,
    }));

    res.json({
      success: true,
      data: populated,
      pagination: paginateResults(total, page, limit),
    });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const countResult = await queryOne('SELECT COUNT(*) as c FROM notifications WHERE userId = ? AND isRead = 0', [req.user._id]);
    const count = countResult?.c || 0;
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Get unread count error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByUserAndId(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const updated = await Notification.markRead(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ success: false, message: 'Server error marking notification as read' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await Notification.markAllRead(req.user._id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByUserAndId(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await Notification.deleteById(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting notification' });
  }
});

module.exports = router;
