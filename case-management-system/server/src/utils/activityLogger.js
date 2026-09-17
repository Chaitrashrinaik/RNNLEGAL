const { v4: uuidv4 } = require('uuid');
const { getDb, queryOne } = require('../config/db');

const logActivity = async ({ userId, userName, advocateId, role, action, entity, entityId, caseId, module, oldValue, newValue, relatedId, details, ipAddress }) => {
  try {
    const id = uuidv4();
    const finalUserId = userId || null;
    let finalAdvocateId = advocateId || null;
    let finalRole = role || null;
    let finalUserName = userName || 'System';

    if (finalUserId && (!finalAdvocateId || !finalRole)) {
      try {
        const user = await queryOne('SELECT advocateId, role, name FROM users WHERE id = ?', [finalUserId]);
        if (user) {
          if (!finalAdvocateId) finalAdvocateId = user.advocateId || null;
          if (!finalRole) finalRole = user.role || null;
          if (!userName || userName === 'System') finalUserName = user.name || finalUserName;
        }
      } catch (e) { /* ignore */ }
    }

    const oldValStr = oldValue ? (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)).substring(0, 2000) : null;
    const newValStr = newValue ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)).substring(0, 2000) : null;
    const detailsStr = details ? String(details).substring(0, 5000) : null;

    await getDb().execute(
      `INSERT INTO activity_logs (id, userId, advocateId, userName, role, action, entity, entityId, caseId, module, oldValue, newValue, relatedId, details, ipAddress, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [finalUserId, finalAdvocateId, finalUserName, finalRole, action, entity || null, entityId || null, caseId || null, module || null, oldValStr, newValStr, relatedId || null, detailsStr, ipAddress || null]
    );
  } catch (error) {
    console.error('Log activity error:', error.message);
  }
};

const logFromRequest = async (req, opts) => {
  const user = req.user || {};
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || null;
  await logActivity({
    userId: user.id || user._id || null,
    userName: user.name || null,
    advocateId: user.advocateId || null,
    role: user.role || null,
    ipAddress: ip,
    ...opts,
  });
};

module.exports = { logActivity, logFromRequest };
