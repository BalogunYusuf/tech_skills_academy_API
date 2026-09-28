const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getAuditLogs);

module.exports = router;
