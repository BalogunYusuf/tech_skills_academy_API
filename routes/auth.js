const express = require('express');
const router = express.Router();
const {
  registerStudent,
  login,
  staffLogin,
  logout,
  forgotPassword,
  resetPassword,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerStudent);
router.post('/login', login);
router.post('/staff-login', staffLogin);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
