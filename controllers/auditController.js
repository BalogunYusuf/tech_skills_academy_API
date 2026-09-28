const AuditLog = require('../models/AuditLog');

// @desc    List audit logs (paginated, newest first)
// @route   GET /api/audit-logs?page=1&limit=50
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);

    const [logs, total] = await Promise.all([
      AuditLog.find().sort('-createdAt').skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments()
    ]);

    res.status(200).json({ success: true, count: logs.length, total, page, pages: Math.ceil(total / limit), data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
