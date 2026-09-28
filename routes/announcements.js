const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, staffOnly } = require('../middleware/auth');

router.get('/', protect, getAnnouncements);
router.post('/', protect, staffOnly, createAnnouncement);
router.delete('/:id', protect, staffOnly, deleteAnnouncement);

module.exports = router;
