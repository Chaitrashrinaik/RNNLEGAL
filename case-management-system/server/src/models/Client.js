const crypto = require('crypto');
const { getDb, queryAll, queryOne, saveDb } = require('../config/db');

const parseJson = (v, def) => {
  if (v === null || v === undefined) return def;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return def; }
};

const sanitize = (c) => {
  if (!c) return null;
  const s = { ...c };
  delete s.portalPassword;
  s._id = s.id;
  s.address = parseJson(s.address, {});
  return s;
};

const parseClient = (c) => {
  if (!c) return null;
  const s = { ...c };
  s._id = s.id;
  s.address = parseJson(s.address, {});
  delete s.portalPassword;
  return s;
};

module.exports = {
  sanitize,
  parseClient,

  async findById(id) {
    return sanitize(await queryOne('SELECT * FROM clients WHERE id = ?', [id]));
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const email = data.email ? data.email.toLowerCase() : null;
    await getDb().execute(
      'INSERT INTO clients (id,name,email,phone,address,company,panNumber,aadharNumber,notes,portalEnabled,portalPassword,createdBy,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.name, email, data.phone || null,
        JSON.stringify(data.address || {}), data.company || '',
        data.panNumber || null, data.aadharNumber || null, data.notes || '',
        data.portalEnabled ? 1 : 0, data.portalPassword || null,
        data.createdBy, now, now]
    );
    saveDb();
    return this.findById(id);
  },

  async updateById(id, updates) {
    const allowed = ['name', 'email', 'phone', 'address', 'company', 'panNumber', 'aadharNumber', 'notes', 'portalEnabled', 'portalPassword', 'portalLastAccessed', 'resetOtp', 'resetOtpExpiry', 'emergencyContact', 'profilePhoto'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.includes(k)) {
        sets.push(`${k} = ?`);
        if (k === 'address' && typeof v === 'object') vals.push(JSON.stringify(v));
        else if (k === 'email') vals.push(String(v).toLowerCase());
        else vals.push(v);
      }
    }
    if (sets.length === 0) return this.findById(id);
    sets.push('updatedAt = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await getDb().execute(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
    return this.findById(id);
  },

  async deleteById(id) {
    await getDb().execute('DELETE FROM clients WHERE id = ?', [id]);
    saveDb();
  },

  async count(query = {}) {
    let sql = 'SELECT COUNT(*) as c FROM clients';
    const conds = [];
    const vals = [];
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) { conds.push(`${k} = ?`); vals.push(v); }
    }
    if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
    const r = await queryOne(sql, vals);
    return r ? r.c : 0;
  },

  async findAll({ query = {}, sort = {}, skip = 0, limit = 10 } = {}) {
    let sql = 'SELECT * FROM clients';
    const conds = [];
    const vals = [];
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) { conds.push(`${k} = ?`); vals.push(v); }
    }
    if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
    const sortKey = Object.keys(sort)[0] || 'createdAt';
    const sortDir = sort[sortKey] === 1 ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortKey} ${sortDir} LIMIT ? OFFSET ?`;
    vals.push(limit, skip);
    return (await queryAll(sql, vals)).map(sanitize);
  },

  async findByEmail(email) {
    if (!email) return null;
    return await queryOne('SELECT * FROM clients WHERE email = ?', [email.toLowerCase()]);
  },
};
