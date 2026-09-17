const crypto = require('crypto');
const { queryAll, queryOne, saveDb } = require('../config/db');

const parseJson = (v, def) => {
  if (v === null || v === undefined) return def;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return def; }
};

const parseInvoice = (inv) => {
  if (!inv) return null;
  return {
    ...inv,
    _id: inv.id,
    items: parseJson(inv.items, []),
  };
};

module.exports = {
  parseInvoice,
  parseJson,

  async findById(id) {
    return parseInvoice(await queryOne('SELECT * FROM invoices WHERE id = ?', [id]));
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sql = `INSERT INTO invoices (id,invoiceNumber,clientId,caseId,items,subtotal,tax,total,status,dueDate,paidDate,paidAmount,paymentMethod,notes,createdBy,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const vals = [id, data.invoiceNumber, data.clientId || data.client,
        data.caseId || data.case || null,
        JSON.stringify(data.items || []),
        data.subtotal, data.tax || 0, data.total,
        data.status || 'draft', data.dueDate || null,
        data.paidDate || null, data.paidAmount || 0,
        data.paymentMethod || null, data.notes || '',
        data.createdBy, now, now];
    await queryAll(sql, vals);
    saveDb();
    return this.findById(id);
  },

  async updateById(id, updates) {
    const allowed = ['items', 'subtotal', 'tax', 'total', 'status', 'dueDate', 'paidDate', 'paidAmount', 'paymentMethod', 'notes'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.includes(k)) {
        sets.push(`${k} = ?`);
        if (Array.isArray(v)) vals.push(JSON.stringify(v));
        else vals.push(v);
      }
    }
    if (sets.length === 0) return this.findById(id);
    sets.push('updatedAt = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await queryAll(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
    return this.findById(id);
  },

  async deleteById(id) {
    await queryAll('DELETE FROM invoices WHERE id = ?', [id]);
    saveDb();
  },

  async count(query = {}) {
    let sql = 'SELECT COUNT(*) as c FROM invoices';
    const conds = [];
    const vals = [];
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) { conds.push(`${k} = ?`); vals.push(v); }
    }
    if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
    const r = await queryOne(sql, vals);
    return r ? r.c : 0;
  },
};
