const crypto = require('crypto');
const { getDb, queryAll, queryOne, saveDb } = require('../config/db');

const parseJson = (v, def) => {
  if (v === null || v === undefined) return def;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return def; }
};

const parseCase = (c) => {
  if (!c) return null;
  return {
    ...c,
    _id: c.id,
    orders: parseJson(c.orders, []),
    hearingHistory: parseJson(c.hearingHistory, []),
    hearings: parseJson(c.hearingHistory, []),
    notes: parseJson(c.notes, []),
    tags: parseJson(c.tags, []),
    reminders: parseJson(c.reminders, []),
    totalFee: parseFloat(c.totalFee) || 0,
    amountPaid: parseFloat(c.amountPaid) || 0,
    amountPending: parseFloat(c.amountPending) || 0,
  };
};

module.exports = {
  parseCase,
  parseJson,

  async findById(id) {
    return parseCase(await queryOne('SELECT * FROM cases WHERE id = ?', [id]));
  },

  async findByCaseNumber(caseNumber) {
    return await queryOne('SELECT * FROM cases WHERE caseNumber = ?', [caseNumber]);
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await getDb().execute(
      `INSERT INTO cases (id,caseNumber,caseTitle,caseType,court,courtName,judgeName,clientId,filingDate,nextHearingDate,lastHearingDate,status,priority,description,oppositeParty,oppositePartyLawyer,orders,hearingHistory,tags,reminders,createdBy,createdAt,updatedAt,caseCategory,courtNumber,location,caseRegistrationDate,caseStage,seniorAdvocateId,totalFee,amountPaid,amountPending,nextPaymentDue,paymentDueDate,nextHearingPurpose,caseOutcome,cnr,juniorAdvocateId,supportingAdvocateIds,assignedOn,assignedBy,courtLocation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.caseNumber, data.caseTitle, data.caseType, data.court,
        data.courtName || '', data.judgeName || '', data.clientId || data.client,
        data.filingDate || now, data.nextHearingDate || null,
        data.lastHearingDate || null, data.status || 'pending',
        data.priority || 'medium', data.description || '',
        data.oppositeParty || '', data.oppositePartyLawyer || '',
        JSON.stringify(data.orders || []),
        JSON.stringify(data.hearingHistory || []),
        JSON.stringify(data.tags || []),
        JSON.stringify(data.reminders || []),
        data.createdBy, now, now,
        data.caseCategory || null, data.courtNumber || null, data.location || null,
        data.caseRegistrationDate || null, data.caseStage || null, data.seniorAdvocateId || null,
        data.totalFee || 0, data.amountPaid || 0, data.amountPending || 0,
        data.nextPaymentDue || null, data.paymentDueDate || null, data.nextHearingPurpose || null,
        data.caseOutcome || null, data.cnr || null,
        data.juniorAdvocateId || null,
        data.supportingAdvocateIds ? JSON.stringify(data.supportingAdvocateIds) : null,
        data.assignedOn || null, data.assignedBy || null,
        data.courtLocation || null]
    );
    saveDb();
    return this.findById(id);
  },

  async updateById(id, updates) {
    const allowed = ['caseNumber', 'caseTitle', 'caseType', 'court', 'courtName', 'judgeName', 'clientId', 'filingDate', 'nextHearingDate', 'lastHearingDate', 'status', 'priority', 'description', 'oppositeParty', 'oppositePartyLawyer', 'orders', 'hearingHistory', 'notes', 'tags', 'reminders', 'caseOutcome', 'caseCategory', 'courtNumber', 'location', 'caseRegistrationDate', 'caseStage', 'seniorAdvocateId', 'totalFee', 'amountPaid', 'amountPending', 'nextPaymentDue', 'paymentDueDate', 'nextHearingPurpose', 'cnr', 'juniorAdvocateId', 'supportingAdvocateIds', 'assignedOn', 'assignedBy', 'courtLocation'];
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
    await getDb().execute(`UPDATE cases SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
    return this.findById(id);
  },

  async deleteById(id) {
    await getDb().execute('DELETE FROM case_advocates WHERE caseId = ?', [id]);
    await getDb().execute('DELETE FROM documents WHERE caseId = ?', [id]);
    await getDb().execute('DELETE FROM cases WHERE id = ?', [id]);
    saveDb();
  },

  async getAdvocates(caseId) {
    return (await queryAll(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.firmName
       FROM case_advocates ca JOIN users u ON ca.userId = u.id WHERE ca.caseId = ?`,
      [caseId]
    )).map(u => { u._id = u.id; return u; });
  },

  async setAdvocates(caseId, userIds) {
    await getDb().execute('DELETE FROM case_advocates WHERE caseId = ?', [caseId]);
    for (const uid of (userIds || [])) {
      await getDb().execute('INSERT INTO case_advocates (caseId, userId) VALUES (?, ?)', [caseId, uid]);
    }
    saveDb();
  },

  async count(query = {}) {
    let sql = 'SELECT COUNT(*) as c FROM cases';
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
