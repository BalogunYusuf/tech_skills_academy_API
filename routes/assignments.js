const express = require('express');
const router = express.Router();
const {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission
} = require('../controllers/assignmentController');
const { protect, staffOnly } = require('../middleware/auth');

router.get('/', protect, getAssignments);
router.post('/', protect, staffOnly, createAssignment);
router.get('/:id', protect, getAssignment);
router.put('/:id', protect, staffOnly, updateAssignment);
router.delete('/:id', protect, staffOnly, deleteAssignment);
router.post('/:id/submit', protect, submitAssignment);
router.put('/:id/grade', protect, staffOnly, gradeSubmission);

module.exports = router;
