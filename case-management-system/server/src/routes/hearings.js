const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, getDb } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { caseId, status, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];

    if (caseId) { where += ' AND h.caseId = ?'; params.push(caseId); }
    if (status) { where += ' AND h.status = ?'; params.push(status); }
    if (startDate) { where += ' AND h.hearingDate >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND h.hearingDate <= ?'; params.push(endDate); }

    const countSql = `SELECT COUNT(*) as total FROM hearings h ${where}`;
    const total = (await queryOne(countSql, params))?.total || 0;

    const sql = `SELECT h.*, c.caseNumber, c.caseTitle, c.court, c.courtName as caseCourtName, c.judgeName as caseJudgeName
      FROM hearings h LEFT JOIN cases c ON h.caseId = c.id ${where} ORDER BY h.hearingDate DESC LIMIT ? OFFSET ?`;
    const hearings = await queryAll(sql, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: hearings.map(h => {
        const parsed = { ...h, _id: h.id };
        if (parsed.hearingDate) parsed.hearingDate = new Date(parsed.hearingDate).toISOString();
        if (parsed.nextHearingDate) parsed.nextHearingDate = new Date(parsed.nextHearingDate).toISOString();
        if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt).toISOString();
        if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt).toISOString();
        return parsed;
      }),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get hearings error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching hearings' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let where = 'WHERE h.hearingDate >= ? AND h.hearingDate < ?';
    const params = [today.toISOString(), tomorrow.toISOString()];

    const hearings = await queryAll(
      `SELECT h.*, c.caseNumber, c.caseTitle FROM hearings h LEFT JOIN cases c ON h.caseId = c.id ${where} ORDER BY h.hearingDate ASC`,
      params
    );

    res.json({ success: true, data: hearings.map(h => ({ ...h, _id: h.id })) });
  } catch (error) {
    console.error('Get today hearings error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const hearing = await queryOne('SELECT h.*, c.caseNumber, c.caseTitle FROM hearings h LEFT JOIN cases c ON h.caseId = c.id WHERE h.id = ?', [req.params.id]);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });

    hearing._id = hearing.id;
    if (hearing.hearingDate) hearing.hearingDate = new Date(hearing.hearingDate).toISOString();
    if (hearing.nextHearingDate) hearing.nextHearingDate = new Date(hearing.nextHearingDate).toISOString();

    res.json({ success: true, data: hearing });
  } catch (error) {
    console.error('Get hearing error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', checkPermission('cases', 'add'), async (req, res) => {
  try {
    const { caseId, hearingDate, court, courtName, courtHall, judgeName, notes } = req.body;
    if (!caseId || !hearingDate) return res.status(400).json({ success: false, message: 'Case and hearing date are required' });

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await getDb().execute(
      `INSERT INTO hearings (id, caseId, hearingDate, court, courtName, courtHall, judgeName, notes, status, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
      [id, caseId, new Date(hearingDate).toISOString().slice(0, 19).replace('T', ' '), court || null, courtName || null, courtHall || null, judgeName || null, notes || null, req.user._id, now, now]
    );

    await getDb().execute('UPDATE cases SET nextHearingDate = ?, status = CASE WHEN status = ? THEN ? ELSE status END, updatedAt = ? WHERE id = ?',
      [new Date(hearingDate).toISOString().slice(0, 19).replace('T', ' '), 'draft', 'active', now, caseId]);

    const caseItem = await queryOne('SELECT hearingHistory, courtName, judgeName FROM cases WHERE id = ?', [caseId]);
    if (caseItem) {
      const hearingHistory = JSON.parse(caseItem.hearingHistory || '[]');
      hearingHistory.push({
        id,
        date: hearingDate,
        notes: notes || '',
        outcome: '',
        arguments: '',
        documentsSubmitted: '',
        judgeRemarks: '',
        nextSteps: '',
        nextHearingDate: null,
      });
      await getDb().execute('UPDATE cases SET hearingHistory = ?, lastHearingDate = ?, updatedAt = ? WHERE id = ?',
        [JSON.stringify(hearingHistory), hearingDate, now, caseId]);
    }

    const hearing = await queryOne('SELECT h.*, c.caseNumber, c.caseTitle FROM hearings h LEFT JOIN cases c ON h.caseId = c.id WHERE h.id = ?', [id]);
    hearing._id = hearing.id;
    if (hearing.hearingDate) hearing.hearingDate = new Date(hearing.hearingDate).toISOString();
    if (hearing.nextHearingDate) hearing.nextHearingDate = new Date(hearing.nextHearingDate).toISOString();

    res.status(201).json({ success: true, data: hearing });

    logFromRequest(req, { action: 'hearing_created', entity: 'hearing', entityId: hearing.id, caseId: req.body.caseId, module: 'Hearings', details: `Hearing scheduled for case`, newValue: { hearingDate: req.body.hearingDate, court: req.body.court, judgeName: req.body.judgeName } });
  } catch (error) {
    console.error('Create hearing error:', error.message);
    res.status(500).json({ success: false, message: 'Server error creating hearing' });
  }
});

router.put('/:id', checkPermission('cases', 'edit'), async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM hearings WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Hearing not found' });

    const { hearingDate, court, courtName, courtHall, judgeName, outcome, judgeRemarks, nextHearingDate, notes, status } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await getDb().execute(
      `UPDATE hearings SET hearingDate = ?, court = ?, courtName = ?, courtHall = ?, judgeName = ?,
       outcome = ?, judgeRemarks = ?, nextHearingDate = ?, notes = ?, status = ?, updatedAt = ? WHERE id = ?`,
      [
        hearingDate ? new Date(hearingDate).toISOString().slice(0, 19).replace('T', ' ') : existing.hearingDate,
        court !== undefined ? court : existing.court,
        courtName !== undefined ? courtName : existing.courtName,
        courtHall !== undefined ? courtHall : existing.courtHall,
        judgeName !== undefined ? judgeName : existing.judgeName,
        outcome !== undefined ? outcome : existing.outcome,
        judgeRemarks !== undefined ? judgeRemarks : existing.judgeRemarks,
        nextHearingDate ? new Date(nextHearingDate).toISOString().slice(0, 19).replace('T', ' ') : existing.nextHearingDate,
        notes !== undefined ? notes : existing.notes,
        status || existing.status,
        now, req.params.id,
      ]
    );

    if (nextHearingDate) {
      await getDb().execute('UPDATE cases SET nextHearingDate = ?, updatedAt = ? WHERE id = ?',
        [new Date(nextHearingDate).toISOString().slice(0, 19).replace('T', ' '), now, existing.caseId]);
    }

    if (outcome) {
      const caseUpdates = [];
      const caseParams = [];
      if (outcome.toLowerCase().includes('won') || outcome.toLowerCase().includes('favorable')) {
        caseUpdates.push("status = 'won'");
      } else if (outcome.toLowerCase().includes('lost') || outcome.toLowerCase().includes('dismissed')) {
        caseUpdates.push("status = 'lost'");
      } else if (outcome.toLowerCase().includes('adjourn') || outcome.toLowerCase().includes('postpone')) {
        caseUpdates.push("status = 'adjourned'");
      }
      if (caseUpdates.length > 0) {
        caseUpdates.push('updatedAt = ?');
        caseParams.push(now, existing.caseId);
        await getDb().execute(`UPDATE cases SET ${caseUpdates.join(', ')} WHERE id = ?`, caseParams);
      }
    }

    const hearing = await queryOne('SELECT h.*, c.caseNumber, c.caseTitle FROM hearings h LEFT JOIN cases c ON h.caseId = c.id WHERE h.id = ?', [req.params.id]);
    hearing._id = hearing.id;
    if (hearing.hearingDate) hearing.hearingDate = new Date(hearing.hearingDate).toISOString();
    if (hearing.nextHearingDate) hearing.nextHearingDate = new Date(hearing.nextHearingDate).toISOString();

    res.json({ success: true, data: hearing });

    logFromRequest(req, { action: 'hearing_updated', entity: 'hearing', entityId: req.params.id, caseId: hearing.caseId, module: 'Hearings', details: `Hearing updated`, oldValue: existing, newValue: req.body });
  } catch (error) {
    console.error('Update hearing error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating hearing' });
  }
});

router.delete('/:id', checkPermission('cases', 'delete'), async (req, res) => {
  try {
    const hearing = await queryOne('SELECT * FROM hearings WHERE id = ?', [req.params.id]);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });

    await getDb().execute('DELETE FROM hearings WHERE id = ?', [req.params.id]);

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const today = new Date().toISOString().slice(0, 10);
    const nextRow = await queryOne(
      `SELECT MIN(hearingDate) as nextDate FROM hearings WHERE caseId = ? AND status NOT IN ('completed','cancelled') AND hearingDate IS NOT NULL AND hearingDate >= ?`,
      [hearing.caseId, today]
    );
    const nextDate = nextRow?.nextDate || null;
    await getDb().execute('UPDATE cases SET nextHearingDate = ?, updatedAt = ? WHERE id = ?',
      [nextDate, now, hearing.caseId]);

    res.json({ success: true, message: 'Hearing deleted' });

    logFromRequest(req, { action: 'hearing_deleted', entity: 'hearing', entityId: req.params.id, caseId: hearing.caseId, module: 'Hearings', details: 'Hearing deleted' });
  } catch (error) {
    console.error('Delete hearing error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting hearing' });
  }
});

router.post('/:id/outcome', checkPermission('cases', 'edit'), async (req, res) => {
  try {
    const { outcome, judgeRemarks, nextHearingDate, notes } = req.body;
    const existing = await queryOne('SELECT * FROM hearings WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Hearing not found' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await getDb().execute(
      `UPDATE hearings SET outcome = ?, judgeRemarks = ?, nextHearingDate = ?, notes = ?, status = 'completed', updatedAt = ? WHERE id = ?`,
      [outcome || null, judgeRemarks || null, nextHearingDate ? new Date(nextHearingDate).toISOString().slice(0, 19).replace('T', ' ') : null, notes || existing.notes, now, req.params.id]
    );

    if (nextHearingDate) {
      await getDb().execute('UPDATE cases SET nextHearingDate = ?, updatedAt = ? WHERE id = ?',
        [new Date(nextHearingDate).toISOString().slice(0, 19).replace('T', ' '), now, existing.caseId]);
    }

    res.json({ success: true, message: 'Hearing outcome recorded' });

    logFromRequest(req, { action: 'hearing_outcome_recorded', entity: 'hearing', entityId: req.params.id, caseId: existing.caseId, module: 'Hearings', details: `Hearing outcome recorded`, newValue: { outcome: req.body.outcome, nextHearingDate: req.body.nextHearingDate } });
  } catch (error) {
    console.error('Hearing outcome error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
