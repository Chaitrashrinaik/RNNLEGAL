const crypto = require('crypto');
const { getDb, queryAll, queryOne, saveDb } = require('../config/db');

const parseJson = (v, def) => {
  if (v === null || v === undefined) return def;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return def; }
};

const parseDoc = (d) => {
  if (!d) return null;
  return {
    ...d,
    _id: d.id,
    tags: parseJson(d.tags, []),
    versions: parseJson(d.versions, []),
  };
};

module.exports = {
  parseDoc,
  parseJson,

  async findById(id) {
    return parseDoc(await queryOne('SELECT * FROM documents WHERE id = ?', [id]));
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await getDb().execute(
      `INSERT INTO documents (id,title,fileName,originalName,filePath,fileSize,mimeType,caseId,uploadedBy,category,tags,versions,accessLevel,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.title, data.fileName, data.originalName, data.filePath,
        data.fileSize, data.mimeType, data.caseId || null, data.uploadedBy,
        data.category || 'other',
        JSON.stringify(data.tags || []),
        JSON.stringify(data.versions || []),
        data.accessLevel || 'team', now, now]
    );
    saveDb();
    return this.findById(id);
  },

  async updateById(id, updates) {
    const allowed = ['title', 'category', 'tags', 'accessLevel', 'fileName', 'originalName', 'filePath', 'fileSize', 'mimeType', 'versions', 'cloudUrl', 'cloudPublicId', 'thumbnailUrl'];
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
    await getDb().execute(`UPDATE documents SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
    return this.findById(id);
  },

  async deleteById(id) {
    await getDb().execute('DELETE FROM documents WHERE id = ?', [id]);
    saveDb();
  },

  async count(query = {}) {
    let sql = 'SELECT COUNT(*) as c FROM documents';
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
