const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getTeacherDashboard,
  getAdminDashboard
} = require('../controllers/dashboardController');
const { protect, staffOnly, adminOnly } = require('../middleware/auth');

router.get('/student', protect, (req, res, next) =>
  req.user.role === 'student' ? getStudentDashboard(req, res, next) : res.status(403).json({ success: false, message: 'Students only' })
);
router.get('/teacher', protect, staffOnly, getTeacherDashboard);
router.get('/admin', protect, adminOnly, getAdminDashboard);

module.exports = router;
