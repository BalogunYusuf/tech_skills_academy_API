const express = require('express');
const router = express.Router();
const { protect, staffOnly } = require('../middleware/auth');
const { getLessons, createLesson, updateLesson, deleteLesson } = require('../controllers/lessonController');
router.get('/', protect, getLessons);
router.post('/', protect, staffOnly, createLesson);
router.put('/:id', protect, staffOnly, updateLesson);
router.delete('/:id', protect, staffOnly, deleteLesson);
module.exports = router;
