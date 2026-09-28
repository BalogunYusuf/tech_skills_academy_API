const express = require('express');
const router = express.Router();
const {
  getQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  attemptQuiz,
  getResults
} = require('../controllers/quizController');
const { protect, staffOnly } = require('../middleware/auth');

router.get('/', protect, getQuizzes);
router.post('/', protect, staffOnly, createQuiz);
router.get('/:id', protect, getQuiz);
router.put('/:id', protect, staffOnly, updateQuiz);
router.delete('/:id', protect, staffOnly, deleteQuiz);
router.post('/:id/attempt', protect, attemptQuiz);
router.get('/:id/results', protect, getResults);

module.exports = router;
