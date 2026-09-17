const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const { queryAll, queryOne } = require('../config/db');
const { logFromRequest } = require('../utils/activityLogger');
const logger = require('../utils/logger');

const router = express.Router();
router.use(auth);

// GET /api/assignments/:caseId - Get assignment history for a case
router.get('/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const assignments = await queryAll(
      'SELECT ah.*, u.name as advocateName, u.email as advocateEmail, u.barCouncilNumber, u.advocateId as advocateCode FROM assignment_history ah LEFT JOIN users u ON ah.advocateId = u.id WHERE ah.caseId = ? ORDER BY ah.assignedAt DESC',
      [caseId]
    );
    const active = assignments.filter(a => a.isActive);
    res.json({ success: true, data: { active, history: assignments } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/assignments - Create assignment (assign advocate to case)
router.post('/', async (req, res) => {
  try {
    const { caseId, advocateId, role, notes } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const advocate = await queryOne('SELECT id, name FROM users WHERE id = ?', [advocateId]);
    if (!advocate) return res.status(404).json({ success: false, message: 'Advocate not found' });

    const caseRow = await queryOne('SELECT id, title FROM cases WHERE id = ?', [caseId]);
    if (!caseRow) return res.status(404).json({ success: false, message: 'Case not found' });

    // Deactivate existing active assignment of same role for this case
    if (role === 'junior') {
      await queryAll(
        'UPDATE assignment_history SET isActive = 0, unassignedAt = ? WHERE caseId = ? AND role = ? AND isActive = 1',
        [now, caseId, role]
      );
      await queryAll('UPDATE cases SET juniorAdvocateId = ?, assignedOn = ?, assignedBy = ? WHERE id = ?', [advocateId, now, userId, caseId]);
    } else if (role === 'senior') {
      await queryAll(
        'UPDATE assignment_history SET isActive = 0, unassignedAt = ? WHERE caseId = ? AND role = ? AND isActive = 1',
        [now, caseId, role]
      );
      await queryAll('UPDATE cases SET seniorAdvocateId = ? WHERE id = ?', [advocateId, caseId]);
    } else if (role === 'supporting') {
      const existing = await queryOne('SELECT supportingAdvocateIds FROM cases WHERE id = ?', [caseId]);
      let ids = [];
      try { ids = JSON.parse(existing?.supportingAdvocateIds || '[]'); } catch { ids = []; }
      if (!ids.includes(advocateId)) ids.push(advocateId);
      await queryAll('UPDATE cases SET supportingAdvocateIds = ? WHERE id = ?', [JSON.stringify(ids), caseId]);
    }

    const id = uuidv4();
    await queryAll(
      'INSERT INTO assignment_history (id, caseId, advocateId, role, assignedBy, assignedByName, assignedAt, isActive, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
      [id, caseId, advocateId, role, userId, userName, now, notes || null, now]
    );

    // Create notification for the assigned advocate
    const notifId = uuidv4();
    const notifMsg = role === 'junior'
      ? `You have been assigned as Junior Advocate on case "${caseRow.title || caseId}"`
      : role === 'senior'
      ? `You have been assigned as Senior Advocate on case "${caseRow.title || caseId}"`
      : `You have been added as Supporting Advocate on case "${caseRow.title || caseId}"`;
    await queryAll(
      'INSERT INTO notifications (id, userId, title, message, type, entity, entityId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
      [notifId, advocateId, 'Case Assignment', notifMsg, 'assignment', 'case', caseId, now]
    );

    // Record task history for the case
    const histId = uuidv4();
    await queryAll(
      'INSERT INTO task_history (id, taskId, action, changedBy, changedByName, newValue, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [histId, caseId, 'advocate_assigned', userId, userName, `${advocate.name} (${role})`, notes || `Assigned as ${role} advocate`, now]
    );

    res.json({ success: true, data: { id, advocateId, role, assignedAt: now } });
    logFromRequest(req, { action: 'advocate_assigned', entity: 'case', entityId: req.body.caseId, caseId: req.body.caseId, module: 'Assignments', details: `Advocate assigned to case (role: ${req.body.role})`, newValue: { advocateId: req.body.advocateId, role: req.body.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/assignments/:id - Remove assignment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryAll('UPDATE assignment_history SET isActive = 0, unassignedAt = ? WHERE id = ?', [now, id]);
    const assignment = await queryOne('SELECT * FROM assignment_history WHERE id = ?', [id]);
    if (assignment) {
      if (assignment.role === 'junior') {
        await queryAll('UPDATE cases SET juniorAdvocateId = NULL WHERE id = ?', [assignment.caseId]);
      } else if (assignment.role === 'senior') {
        await queryAll('UPDATE cases SET seniorAdvocateId = NULL WHERE id = ?', [assignment.caseId]);
      }
    }
    res.json({ success: true, data: { id } });
    logFromRequest(req, { action: 'advocate_unassigned', entity: 'case', entityId: assignment?.caseId, caseId: assignment?.caseId, module: 'Assignments', details: 'Advocate removed from case' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
