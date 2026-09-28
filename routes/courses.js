const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse
} = require('../controllers/courseController');
const { protect, staffOnly } = require('../middleware/auth');

router.get('/', protect, getCourses);
router.get('/:id', protect, getCourse);
router.post('/', protect, staffOnly, createCourse);
router.put('/:id', protect, staffOnly, updateCourse);
router.delete('/:id', protect, staffOnly, deleteCourse);
router.post('/:id/enroll', protect, enrollCourse);

module.exports = router;
