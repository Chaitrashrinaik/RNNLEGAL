const crypto = require('crypto');
const { getDb, queryAll, queryOne, saveDb } = require('../config/db');

const parseNotif = (n) => {
  if (!n) return null;
  return { ...n, _id: n.id, isRead: !!n.isRead };
};

module.exports = {
  parseNotif,

  async findById(id) {
    return parseNotif(await queryOne('SELECT * FROM notifications WHERE id = ?', [id]));
  },

  async findByUserAndId(id, userId) {
    return parseNotif(await queryOne('SELECT * FROM notifications WHERE id = ? AND userId = ?', [id, userId]));
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await getDb().execute(
      'INSERT INTO notifications (id,userId,title,message,type,caseId,isRead,link,createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, data.userId || data.user, data.title, data.message,
        data.type || 'system', data.caseId || data.case || null,
        data.isRead ? 1 : 0, data.link || null, now]
    );
    saveDb();
    return this.findById(id);
  },

  async count(query = {}) {
    let sql = 'SELECT COUNT(*) as c FROM notifications';
    const conds = [];
    const vals = [];
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) { conds.push(`${k} = ?`); vals.push(v); }
    }
    if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
    const r = await queryOne(sql, vals);
    return r ? r.c : 0;
  },

  async markRead(id) {
    await getDb().execute('UPDATE notifications SET isRead = 1 WHERE id = ?', [id]);
    saveDb();
    return this.findById(id);
  },

  async markAllRead(userId) {
    await getDb().execute('UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0', [userId]);
    saveDb();
  },

  async deleteById(id) {
    await getDb().execute('DELETE FROM notifications WHERE id = ?', [id]);
    saveDb();
  },

  async deleteOldread(cutoffDate) {
    await getDb().execute('DELETE FROM notifications WHERE createdAt < ? AND isRead = 1', [cutoffDate]);
    saveDb();
  },
};
