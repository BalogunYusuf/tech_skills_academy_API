const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getStudents,
  getStaff,
  createStaff
} = require('../controllers/userController');
const { protect, staffOnly, adminOnly } = require('../middleware/auth');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.get('/students', protect, staffOnly, getStudents);
router.get('/staff', protect, adminOnly, getStaff);
router.post('/staff', protect, adminOnly, createStaff);

module.exports = router;
