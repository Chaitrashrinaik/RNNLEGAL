const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, getDb } = require('../config/db');
const { auth } = require('../middleware/auth');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();
router.use(auth);

router.get('/:caseId', async (req, res) => {
  try {
    const updates = await queryAll(
      `SELECT cu.*, u.name as addedByName FROM case_updates cu LEFT JOIN users u ON cu.addedBy = u.id WHERE cu.caseId = ? ORDER BY cu.createdAt DESC`,
      [req.params.caseId]
    );
    res.json({ success: true, data: updates.map(u => ({ ...u, _id: u.id })) });
  } catch (error) {
    console.error('Get case updates error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:caseId', async (req, res) => {
  try {
    const { title, description, priority, relatedHearingDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const caseItem = await queryOne('SELECT id FROM cases WHERE id = ?', [req.params.caseId]);
    if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await getDb().execute(
      `INSERT INTO case_updates (id, caseId, title, description, priority, relatedHearingDate, addedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.caseId, title, description || null, priority || 'medium', relatedHearingDate || null, req.user._id, now, now]
    );

    const update = await queryOne('SELECT cu.*, u.name as addedByName FROM case_updates cu LEFT JOIN users u ON cu.addedBy = u.id WHERE cu.id = ?', [id]);
    update._id = update.id;
    res.status(201).json({ success: true, data: update });
    logFromRequest(req, { action: 'case_update_added', entity: 'case_update', entityId: id, caseId: req.params.caseId, module: 'Cases', details: `Case update: ${req.body.title || req.body.updateType}` });
  } catch (error) {
    console.error('Create case update error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM case_updates WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Update not found' });

    const { title, description, priority, relatedHearingDate } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await getDb().execute(
      `UPDATE case_updates SET title = ?, description = ?, priority = ?, relatedHearingDate = ?, updatedAt = ? WHERE id = ?`,
      [title || existing.title, description !== undefined ? description : existing.description, priority || existing.priority, relatedHearingDate !== undefined ? relatedHearingDate : existing.relatedHearingDate, now, req.params.id]
    );

    const update = await queryOne('SELECT cu.*, u.name as addedByName FROM case_updates cu LEFT JOIN users u ON cu.addedBy = u.id WHERE cu.id = ?', [req.params.id]);
    update._id = update.id;
    res.json({ success: true, data: update });
    logFromRequest(req, { action: 'case_update_edited', entity: 'case_update', entityId: req.params.id, module: 'Cases', details: 'Case update edited' });
  } catch (error) {
    console.error('Update case update error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const update = await queryOne('SELECT * FROM case_updates WHERE id = ?', [req.params.id]);
    if (!update) return res.status(404).json({ success: false, message: 'Update not found' });
    await getDb().execute('DELETE FROM case_updates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Update deleted' });
    logFromRequest(req, { action: 'case_update_deleted', entity: 'case_update', entityId: req.params.id, module: 'Cases', details: 'Case update deleted' });
  } catch (error) {
    console.error('Delete case update error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
