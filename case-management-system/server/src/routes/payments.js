const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, getDb } = require('../config/db');
const { auth } = require('../middleware/auth');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { caseId, clientId, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];

    if (caseId) { where += ' AND p.caseId = ?'; params.push(caseId); }
    if (clientId) { where += ' AND p.clientId = ?'; params.push(clientId); }
    if (status) { where += ' AND p.status = ?'; params.push(status); }

    const total = (await queryOne(`SELECT COUNT(*) as total FROM payments p ${where}`, params))?.total || 0;
    const payments = await queryAll(
      `SELECT p.*, u.name as recordedByName, c.caseNumber
       FROM payments p LEFT JOIN users u ON p.recordedBy = u.id LEFT JOIN cases c ON p.caseId = c.id
       ${where} ORDER BY p.paymentDate DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: payments.map(p => ({ ...p, _id: p.id })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get payments error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching payments' });
  }
});

router.get('/summary/:caseId', async (req, res) => {
  try {
    const caseItem = await queryOne('SELECT totalFee, amountPaid, amountPending, nextPaymentDue, paymentDueDate FROM cases WHERE id = ?', [req.params.caseId]);
    if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

    const paymentHistory = await queryAll(
      `SELECT p.*, u.name as recordedByName FROM payments p LEFT JOIN users u ON p.recordedBy = u.id WHERE p.caseId = ? ORDER BY p.paymentDate DESC`,
      [req.params.caseId]
    );

    res.json({
      success: true,
      data: {
        totalFee: caseItem.totalFee || 0,
        amountPaid: caseItem.amountPaid || 0,
        amountPending: caseItem.amountPending || 0,
        nextPaymentDue: caseItem.nextPaymentDue || null,
        paymentDueDate: caseItem.paymentDueDate || null,
        paymentHistory: paymentHistory.map(p => ({ ...p, _id: p.id })),
      },
    });
  } catch (error) {
    console.error('Get payment summary error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { caseId, clientId, amount, paymentMethod, transactionRef, receiptNumber, paymentDate, notes } = req.body;
    if (!caseId || !amount) return res.status(400).json({ success: false, message: 'Case ID and amount are required' });

    const caseItem = await queryOne('SELECT * FROM cases WHERE id = ?', [caseId]);
    if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const payDate = paymentDate ? new Date(paymentDate).toISOString().slice(0, 19).replace('T', ' ') : now;

    await getDb().execute(
      `INSERT INTO payments (id, caseId, clientId, amount, paymentMethod, transactionRef, receiptNumber, paymentDate, status, notes, recordedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
      [id, caseId, clientId || caseItem.clientId, amount, paymentMethod || 'cash', transactionRef || null, receiptNumber || null, payDate, notes || null, req.user._id, now, now]
    );

    const newAmountPaid = (caseItem.amountPaid || 0) + amount;
    const newAmountPending = Math.max(0, (caseItem.totalFee || 0) - newAmountPaid);
    await getDb().execute(
      'UPDATE cases SET amountPaid = ?, amountPending = ?, updatedAt = ? WHERE id = ?',
      [newAmountPaid, newAmountPending, now, caseId]
    );

    const payment = await queryOne('SELECT p.*, u.name as recordedByName FROM payments p LEFT JOIN users u ON p.recordedBy = u.id WHERE p.id = ?', [id]);
    payment._id = payment.id;
    res.status(201).json({ success: true, data: payment });
    logFromRequest(req, { action: 'payment_created', entity: 'payment', entityId: id, caseId: req.body.caseId, module: 'Payments', details: 'Payment recorded', newValue: { amount: req.body.amount, method: req.body.method } });
  } catch (error) {
    console.error('Create payment error:', error.message);
    res.status(500).json({ success: false, message: 'Server error recording payment' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Payment not found' });

    const { amount, paymentMethod, transactionRef, receiptNumber, paymentDate, notes, status } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await getDb().execute(
      `UPDATE payments SET amount = ?, paymentMethod = ?, transactionRef = ?, receiptNumber = ?, paymentDate = ?, notes = ?, status = ?, updatedAt = ? WHERE id = ?`,
      [amount || existing.amount, paymentMethod || existing.paymentMethod, transactionRef !== undefined ? transactionRef : existing.transactionRef, receiptNumber !== undefined ? receiptNumber : existing.receiptNumber, paymentDate ? new Date(paymentDate).toISOString().slice(0, 19).replace('T', ' ') : existing.paymentDate, notes !== undefined ? notes : existing.notes, status || existing.status, now, req.params.id]
    );

    const payment = await queryOne('SELECT p.*, u.name as recordedByName FROM payments p LEFT JOIN users u ON p.recordedBy = u.id WHERE p.id = ?', [req.params.id]);
    payment._id = payment.id;
    res.json({ success: true, data: payment });
    logFromRequest(req, { action: 'payment_updated', entity: 'payment', entityId: req.params.id, module: 'Payments', details: 'Payment updated' });
  } catch (error) {
    console.error('Update payment error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const payment = await queryOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await getDb().execute('DELETE FROM payments WHERE id = ?', [req.params.id]);

    const caseItem = await queryOne('SELECT amountPaid, totalFee FROM cases WHERE id = ?', [payment.caseId]);
    if (caseItem) {
      const newAmountPaid = Math.max(0, (caseItem.amountPaid || 0) - payment.amount);
      const newAmountPending = Math.max(0, (caseItem.totalFee || 0) - newAmountPaid);
      await getDb().execute('UPDATE cases SET amountPaid = ?, amountPending = ?, updatedAt = ? WHERE id = ?', [newAmountPaid, newAmountPending, now, payment.caseId]);
    }

    res.json({ success: true, message: 'Payment deleted' });
    logFromRequest(req, { action: 'payment_deleted', entity: 'payment', entityId: req.params.id, module: 'Payments', details: 'Payment deleted' });
  } catch (error) {
    console.error('Delete payment error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
