const Quiz = require('../models/Quiz');
const { logEvent } = require('../utils/audit');

// Student-safe projection: never leak correct answers or other students' attempts
const studentProjection = '-questions.correctAnswer -attempts';

// @desc    Get quizzes (optionally filtered by course and/or type=quiz|exam)
// @route   GET /api/quizzes?course=xxx&type=exam
// @access  Private
exports.getQuizzes = async (req, res) => {
  try {
    const { course, type } = req.query;
    const query = {};
    if (course) query.course = course;
    if (type) query.type = type;
    if (req.user.role === 'student') query.isPublished = true;

    const projection = req.user.role === 'student' ? studentProjection : '';

    const quizzes = await Quiz.find(query, projection)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: quizzes.length, data: quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Private
exports.getQuiz = async (req, res) => {
  try {
    const projection = req.user.role === 'student' ? studentProjection : '';
    const quiz = await Quiz.findById(req.params.id, projection)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName');

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    if (req.user.role === 'student' && quiz.isPublished === false) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create quiz/exam (questions included)
// @route   POST /api/quizzes
// @access  Private/Staff
exports.createQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.create({ ...req.body, instructor: req.user.id });
    logEvent(req, 'assessment.created', { targetType: 'quiz', targetId: quiz._id, meta: { title: quiz.title, type: quiz.type } });
    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update quiz/exam
// @route   PUT /api/quizzes/:id
// @access  Private/Staff
exports.updateQuiz = async (req, res) => {
  try {
    let quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    if (req.user.role !== 'admin' && quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this quiz' });
    }

    quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete quiz/exam
// @route   DELETE /api/quizzes/:id
// @access  Private/Staff
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    if (req.user.role !== 'admin' && quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this quiz' });
    }

    await quiz.deleteOne();
    logEvent(req, 'assessment.deleted', { targetType: 'quiz', targetId: req.params.id, meta: { title: quiz.title } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Attempt a quiz - answers are scored server-side
// @route   POST /api/quizzes/:id/attempt
// @access  Private/Student
exports.attemptQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'answers must be an array' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    if (quiz.isPublished === false) {
      return res.status(400).json({ success: false, message: 'This assessment is not available' });
    }

    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) {
        score += q.points || 0;
      }
    });

    quiz.attempts.push({ student: req.user.id, answers, score, submittedAt: new Date() });
    await quiz.save();

    res.status(200).json({ success: true, score, totalPoints: quiz.totalPoints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get quiz results (staff see all attempts, students see their own)
// @route   GET /api/quizzes/:id/results
// @access  Private
exports.getResults = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('attempts.student', 'firstName lastName email');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (req.user.role === 'student') {
      const ownAttempts = quiz.attempts.filter((a) => a.student._id.toString() === req.user.id);
      return res.status(200).json({ success: true, data: ownAttempts });
    }

    res.status(200).json({ success: true, data: quiz.attempts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
