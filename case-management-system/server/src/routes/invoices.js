const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { queryAll, queryOne } = require('../config/db');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Case = require('../models/Case');
const { auth, authorize } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { paginationHelper, paginateResults, generateInvoiceNumber } = require('../utils/helpers');
const { sendInvoiceEmail } = require('../services/emailService');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();

router.use(auth);

async function populateInvoices(invoices) {
  if (invoices.length === 0) return [];
  const clientIds = [...new Set(invoices.map(i => i.clientId).filter(Boolean))];
  const caseIds = [...new Set(invoices.map(i => i.caseId).filter(Boolean))];
  const userIds = [...new Set(invoices.map(i => i.createdBy).filter(Boolean))];

  let clients = [], cases = [], users = [];
  if (clientIds.length > 0) clients = await queryAll(`SELECT id,name,email,phone,company FROM clients WHERE id IN (${clientIds.map(() => '?').join(',')})`, clientIds);
  if (caseIds.length > 0) cases = await queryAll(`SELECT id,caseNumber,caseTitle FROM cases WHERE id IN (${caseIds.map(() => '?').join(',')})`, caseIds);
  if (userIds.length > 0) users = await queryAll(`SELECT id,name,email FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds);

  const clientMap = Object.fromEntries(clients.map(c => { c._id = c.id; return [c.id, c]; }));
  const caseMap = Object.fromEntries(cases.map(c => { c._id = c.id; return [c.id, c]; }));
  const userMap = Object.fromEntries(users.map(u => { u._id = u.id; return [u.id, u]; }));

  return invoices.map(inv => ({
    ...Invoice.parseInvoice(inv),
    client: clientMap[inv.clientId] || null,
    case: caseMap[inv.caseId] || null,
    createdBy: userMap[inv.createdBy] || null,
  }));
}

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
    query('client').optional().trim(),
    query('sortBy').optional().isIn(['invoiceNumber', 'total', 'dueDate', 'createdAt', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { page, limit, skip } = paginationHelper(req.query.page, req.query.limit);
      const { status, client: clientId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      let where = 'WHERE 1=1';
      const params = [];

      if (status) { where += ' AND i.status = ?'; params.push(status); }
      if (clientId) { where += ' AND i.clientId = ?'; params.push(clientId); }

      const countResult = await queryOne(`SELECT COUNT(*) as c FROM invoices i ${where}`, params);
      const total = countResult?.c || 0;

      const invoices = await queryAll(
        `SELECT i.* FROM invoices i ${where} ORDER BY i.${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`,
        [...params, limit, skip]
      );

      res.json({
        success: true,
        data: await populateInvoices(invoices),
        pagination: paginateResults(total, page, limit),
      });
    } catch (error) {
      console.error('Get invoices error:', error.message);
      res.status(500).json({ success: false, message: 'Server error fetching invoices' });
    }
  }
);

router.get('/statistics', async (req, res) => {
  try {
    const totalInvoicesResult = await queryOne('SELECT COUNT(*) as c FROM invoices');
    const totalInvoices = totalInvoicesResult?.c || 0;
    const totalRevenueResult = await queryOne("SELECT COALESCE(SUM(paidAmount),0) as t FROM invoices WHERE status = 'paid'");
    const pendingAmountResult = await queryOne("SELECT COALESCE(SUM(total),0) as t FROM invoices WHERE status IN ('sent','draft')");
    const overdueAmountResult = await queryOne("SELECT COALESCE(SUM(total),0) as t FROM invoices WHERE status = 'overdue'");
    const invoicesByStatus = await queryAll('SELECT status as _id, COUNT(*) as count, SUM(total) as amount FROM invoices GROUP BY status');

    const monthlyRevenueRaw = await queryAll(
      `SELECT YEAR(paidDate) as year, MONTH(paidDate) as month,
              SUM(paidAmount) as revenue, COUNT(*) as count
       FROM invoices WHERE status = 'paid' AND paidDate IS NOT NULL
       GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 12`
    );
    const monthlyRevenue = monthlyRevenueRaw.map(r => ({ _id: { year: parseInt(r.year), month: parseInt(r.month) }, revenue: r.revenue, count: r.count }));

    res.json({
      success: true,
      data: {
        totalInvoices,
        totalRevenue: totalRevenueResult?.t || 0,
        pendingAmount: pendingAmountResult?.t || 0,
        overdueAmount: overdueAmountResult?.t || 0,
        invoicesByStatus,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error('Invoice statistics error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/monthly-earnings', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const earnings = await queryOne(
      `SELECT COALESCE(SUM(paidAmount), 0) as totalEarnings, COUNT(*) as paidCount
       FROM invoices WHERE status = 'paid' AND MONTH(paidDate) = ? AND YEAR(paidDate) = ?`,
      [m, y]
    );

    const pending = await queryOne(
      `SELECT COALESCE(SUM(total), 0) as pendingAmount, COUNT(*) as pendingCount
       FROM invoices WHERE status IN ('sent', 'draft') AND MONTH(createdAt) = ? AND YEAR(createdAt) = ?`,
      [m, y]
    );

    const byCase = await queryAll(
      `SELECT c.caseTitle, c.caseNumber, COALESCE(SUM(i.paidAmount), 0) as earnings
       FROM invoices i LEFT JOIN cases c ON i.caseId = c.id
       WHERE i.status = 'paid' AND MONTH(i.paidDate) = ? AND YEAR(i.paidDate) = ?
       GROUP BY i.caseId ORDER BY earnings DESC`,
      [m, y]
    );

    res.json({
      success: true,
      data: {
        month: m,
        year: y,
        totalEarnings: earnings?.totalEarnings || 0,
        paidCount: earnings?.paidCount || 0,
        pendingAmount: pending?.pendingAmount || 0,
        pendingCount: pending?.pendingCount || 0,
        byCase,
      },
    });
  } catch (error) {
    console.error('Monthly earnings error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/payment-status', async (req, res) => {
  try {
    const { status, paidAmount, paymentMethod } = req.body;
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (paidAmount !== undefined) updates.paidAmount = paidAmount;
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (status === 'paid') {
      updates.paidDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (paidAmount === undefined) {
        updates.paidAmount = invoice.total;
      }
    }

    const updated = await Invoice.updateById(req.params.id, updates);
    res.json({ success: true, data: updated, message: 'Payment status updated' });
    logFromRequest(req, { action: 'payment_status_changed', entity: 'invoice', entityId: req.params.id, module: 'Invoices', details: `Payment status changed to ${req.body.paymentStatus}` });
  } catch (error) {
    console.error('Update payment status error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const populated = (await populateInvoices([invoice]))[0];
    if (populated.client) {
      const fullClient = await queryOne('SELECT * FROM clients WHERE id = ?', [invoice.clientId]);
      if (fullClient) populated.client = Client.parseClient(fullClient);
    }

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Get invoice error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching invoice' });
  }
});

router.post(
  '/',
  checkPermission('invoices', 'add'),
  [
    body('client').notEmpty().withMessage('Valid client ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
    body('items.*.amount').isFloat({ min: 0 }).withMessage('Item amount must be positive'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const client = await queryOne('SELECT id FROM clients WHERE id = ?', [req.body.client]);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      if (req.body.case) {
        const caseItem = await queryOne('SELECT id FROM cases WHERE id = ?', [req.body.case]);
        if (!caseItem) {
          return res.status(404).json({ success: false, message: 'Case not found' });
        }
      }

      const items = req.body.items.map((item) => ({
        ...item,
        total: item.amount * item.quantity,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxRate = req.body.taxRate || 0.18;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      const invoice = await Invoice.create({
        invoiceNumber: generateInvoiceNumber(),
        clientId: req.body.client,
        caseId: req.body.case || null,
        items,
        subtotal,
        tax,
        total,
        status: 'draft',
        dueDate: req.body.dueDate,
        notes: req.body.notes || '',
        createdBy: req.user._id,
      });

      const populated = (await populateInvoices([await queryOne('SELECT * FROM invoices WHERE id = ?', [invoice.id])]))[0];
      res.status(201).json({ success: true, data: populated });
      logFromRequest(req, { action: 'invoice_created', entity: 'invoice', entityId: invoice.id, case: req.body.case || null, module: 'Invoices', details: `Invoice ${invoice.invoiceNumber} created for ₹${invoice.total}`, newValue: { invoiceNumber: invoice.invoiceNumber, total: invoice.total } });
    } catch (error) {
      console.error('Create invoice error:', error.message);
      res.status(500).json({ success: false, message: 'Server error creating invoice' });
    }
  }
);

router.put('/:id', checkPermission('invoices', 'edit'), async (req, res) => {
  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot edit a paid invoice' });
    }

    const updates = { ...req.body };

    if (updates.items && Array.isArray(updates.items)) {
      updates.items = updates.items.map((item) => ({
        ...item,
        total: item.amount * item.quantity,
      }));
      updates.subtotal = updates.items.reduce((sum, item) => sum + item.total, 0);
      const taxRate = updates.taxRate || 0.18;
      updates.tax = updates.subtotal * taxRate;
      updates.total = updates.subtotal + updates.tax;
    }

    delete updates.invoiceNumber;
    delete updates.createdBy;

    await Invoice.updateById(req.params.id, updates);

    const updated = (await populateInvoices([await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id])]))[0];
    res.json({ success: true, data: updated });
    logFromRequest(req, { action: 'invoice_updated', entity: 'invoice', entityId: req.params.id, module: 'Invoices', details: 'Invoice updated' });
  } catch (error) {
    console.error('Update invoice error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating invoice' });
  }
});

router.delete('/:id', authorize('admin', 'manager'), checkPermission('invoices', 'delete'), async (req, res) => {
  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot delete a paid invoice' });
    }

    await Invoice.deleteById(req.params.id);
    res.json({ success: true, message: 'Invoice deleted successfully' });
    logFromRequest(req, { action: 'invoice_deleted', entity: 'invoice', entityId: req.params.id, module: 'Invoices', details: 'Invoice deleted' });
  } catch (error) {
    console.error('Delete invoice error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting invoice' });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Invoice is already paid' });
    }

    const client = await queryOne('SELECT name,email FROM clients WHERE id = ?', [invoice.clientId]);
    if (!client || !client.email) {
      return res.status(400).json({ success: false, message: 'Client not found or has no email address' });
    }
    const emailResult = await sendInvoiceEmail(client.email, client.name, {
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
      status: invoice.status,
    });

    await Invoice.updateById(req.params.id, { status: 'sent' });

    res.json({
      success: true,
      message: 'Invoice sent successfully',
      data: { emailSent: emailResult.success },
    });
    logFromRequest(req, { action: 'invoice_sent', entity: 'invoice', entityId: req.params.id, module: 'Invoices', details: `Invoice sent to ${req.body.email || 'client'}` });
  } catch (error) {
    console.error('Send invoice error:', error.message);
    res.status(500).json({ success: false, message: 'Server error sending invoice' });
  }
});

router.post(
  '/:id/payment',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be positive'),
    body('paymentMethod').isIn(['cash', 'bank-transfer', 'upi', 'cheque', 'card', 'other']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }

      const { amount, paymentMethod } = req.body;

      if (invoice.paidAmount + amount > invoice.total) {
        return res.status(400).json({
          success: false,
          message: `Payment amount exceeds remaining balance. Outstanding: Rs. ${invoice.total - invoice.paidAmount}`,
        });
      }

      const newPaidAmount = invoice.paidAmount + amount;
      const updates = { paidAmount: newPaidAmount, paymentMethod };

      if (newPaidAmount >= invoice.total) {
        updates.status = 'paid';
        updates.paidDate = new Date().toISOString();
      }

      await Invoice.updateById(req.params.id, updates);

      const updated = await Invoice.findById(req.params.id);
      res.json({
        success: true,
        data: updated,
        message: paymentMethod ? 'Payment recorded successfully' : 'Payment recorded',
      });
      logFromRequest(req, { action: 'payment_recorded', entity: 'invoice', entityId: req.params.id, module: 'Invoices', details: `Payment of ₹${req.body.amount} recorded`, newValue: { amount: req.body.amount, method: req.body.method } });
    } catch (error) {
      console.error('Record payment error:', error.message);
      res.status(500).json({ success: false, message: 'Server error recording payment' });
    }
  }
);

router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [invoice.clientId]);
    const caseItem = invoice.caseId ? await queryOne('SELECT caseNumber FROM cases WHERE id = ?', [invoice.caseId]) : null;
    const items = JSON.parse(invoice.items || '[]');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; }
          .totals { text-align: right; }
          .totals table { width: 300px; margin-left: auto; }
          .totals td { font-weight: bold; }
          .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>${invoice.invoiceNumber}</p>
        </div>
        <div class="invoice-details">
          <div>
            <h3>To:</h3>
            <p><strong>${client ? client.name : ''}</strong></p>
            <p>${client ? client.email : ''}</p>
            <p>${client ? client.phone : ''}</p>
          </div>
          <div>
            <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : ''}</p>
            <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
            ${caseItem ? `<p><strong>Case:</strong> ${caseItem.caseNumber}</p>` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>Rs. ${item.amount.toLocaleString('en-IN')}</td>
                <td>Rs. ${item.total.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <table>
            <tr><td>Subtotal</td><td>Rs. ${invoice.subtotal.toLocaleString('en-IN')}</td></tr>
            <tr><td>Tax (GST)</td><td>Rs. ${invoice.tax.toLocaleString('en-IN')}</td></tr>
            <tr><td><strong>Total</strong></td><td><strong>Rs. ${invoice.total.toLocaleString('en-IN')}</strong></td></tr>
          </table>
        </div>
        ${invoice.notes ? `<div class="footer"><p>Notes: ${invoice.notes}</p></div>` : ''}
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Generate PDF error:', error.message);
    res.status(500).json({ success: false, message: 'Server error generating invoice' });
  }
});

module.exports = router;
