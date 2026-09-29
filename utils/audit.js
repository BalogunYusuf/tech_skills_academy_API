const AuditLog = require('../models/AuditLog');

// Fire-and-forget audit logging - never blocks the main request
const logEvent = (req, action, { targetType = null, targetId = null, meta = null } = {}) => {
  const entry = {
    actor: req.user ? req.user._id : null,
    actorName: req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Anonymous',
    actorRole: req.user ? req.user.role : 'guest',
    action,
    targetType,
    targetId: targetId ? String(targetId) : null,
    meta,
    ip: req.ip || req.headers['x-forwarded-for'] || null
  };

  return AuditLog.create(entry).catch((err) => { console.error('Audit log failed:', err.message); return null; });
};

module.exports = { logEvent };
