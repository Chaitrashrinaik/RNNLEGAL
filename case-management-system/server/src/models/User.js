const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb, queryAll, queryOne, saveDb } = require('../config/db');

const sanitize = (u) => {
  if (!u) return null;
  const { password, passwordResetToken, passwordResetExpires, ...s } = u;
  s._id = s.id;
  if (s.permissions && typeof s.permissions === 'string') {
    try { s.permissions = JSON.parse(s.permissions); } catch { s.permissions = null; }
  }
  return s;
};

const DEFAULT_PERMISSIONS = {
  dashboard: { view: true, add: false, edit: false, delete: false },
  cases: { view: true, add: true, edit: true, delete: false },
  clients: { view: true, add: false, edit: false, delete: false },
  documents: { view: true, add: true, edit: false, delete: false },
  invoices: { view: true, add: false, edit: false, delete: false },
  calendar: { view: true, add: true, edit: true, delete: false },
  notifications: { view: true, add: false, edit: false, delete: false },
  settings: { view: false, add: false, edit: false, delete: false },
};

module.exports = {
  sanitize,
  DEFAULT_PERMISSIONS,

  async findById(id) {
    return sanitize(await queryOne('SELECT * FROM users WHERE id = ?', [id]));
  },

  async findByIdRaw(id) {
    return await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  async findByEmail(email) {
    return await queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  },

  async generateAdvocateId() {
    const result = await queryOne("SELECT advocateId FROM users WHERE advocateId IS NOT NULL ORDER BY CAST(SUBSTRING(advocateId, 4) AS UNSIGNED) DESC LIMIT 1");
    if (result && result.advocateId) {
      const num = parseInt(result.advocateId.replace('ADV', ''), 10) + 1;
      return 'ADV' + String(num).padStart(3, '0');
    }
    return 'ADV001';
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const hash = await bcrypt.hash(data.password, 12);
    const advocateId = data.advocateId || (data.role !== 'client' ? await this.generateAdvocateId() : null);
    await getDb().execute(
      'INSERT INTO users (id,name,email,password,role,phone,avatar,firmName,company,panNumber,googleId,advocateId,barCouncilNumber,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.name, data.email.toLowerCase(), hash, data.role || 'staff', data.phone || null, data.avatar || null, data.firmName || '', data.company || null, data.panNumber || null, data.googleId || null, advocateId || null, data.barCouncilNumber || null, now, now]
    );
    saveDb();
    return this.findById(id);
  },

  async updateById(id, updates) {
    const allowed = ['name', 'email', 'phone', 'role', 'isActive', 'firmName', 'avatar', 'lastLogin', 'passwordResetToken', 'passwordResetExpires', 'googleId', 'company', 'panNumber', 'permissions', 'password'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.includes(k)) {
        sets.push(`${k} = ?`);
        if (k === 'permissions') {
          vals.push(v ? JSON.stringify(v) : null);
        } else if (k === 'email') {
          vals.push(String(v).toLowerCase());
        } else if (k === 'password') {
          const bcrypt = require('bcrypt');
          vals.push(await bcrypt.hash(v, 12));
        } else {
          vals.push(v);
        }
      }
    }
    if (sets.length === 0) return this.findById(id);
    sets.push('updatedAt = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await getDb().execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
    return this.findById(id);
  },

  async updatePassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 12);
    await getDb().execute('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [hash, new Date().toISOString(), id]);
    saveDb();
  },

  async count(query = {}) {
    let sql = 'SELECT COUNT(*) as c FROM users';
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
    let sql = 'SELECT * FROM users';
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

  comparePassword(candidate, hash) {
    return bcrypt.compare(candidate, hash);
  },
};
