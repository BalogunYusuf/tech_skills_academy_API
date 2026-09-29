const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const User = require('../models/User');
const { logEvent } = require('../utils/audit');
const studentProjection = '-questions.correctAnswer -attempts';

exports.getQuizzes = async (req, res) => {
  try {
    const query = {};
    if (req.query.course) query.course = req.query.course;
    if (req.query.type) query.type = req.query.type;
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id).select('enrolledCourses');
      query.course = { $in: user.enrolledCourses || [] }; query.isPublished = true;
    }
    if (req.user.role === 'instructor') query.instructor = req.user.id;
    const projection = req.user.role === 'student' ? studentProjection : '';
    const quizzes = await Quiz.find(query, projection).populate('course', 'title').populate('instructor', 'firstName lastName').sort('-createdAt');
    res.json({ success: true, count: quizzes.length, data: quizzes });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getQuiz = async (req, res) => {
  try {
    const projection = req.user.role === 'student' ? studentProjection : '';
    const quiz = await Quiz.findById(req.params.id, projection).populate('course', 'title').populate('instructor', 'firstName lastName');
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.user.role === 'instructor' && String(quiz.instructor?._id || quiz.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (req.user.role === 'student' && !quiz.isPublished) return res.status(404).json({ success: false, message: 'Quiz not found' });
    res.json({ success: true, data: quiz });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const courseAccess = async (req, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) return { status: 404, message: 'Course not found' };
  if (req.user.role !== 'admin' && String(course.instructor) !== req.user.id) return { status: 403, message: 'You are not assigned to this course' };
  return { course };
};

exports.createQuiz = async (req, res) => {
  try {
    const check = await courseAccess(req, req.body.course);
    if (check.message) return res.status(check.status).json({ success: false, message: check.message });
    const quiz = await Quiz.create({ ...req.body, instructor: check.course.instructor });
    await logEvent(req, 'quiz.created', { targetType: 'quiz', targetId: quiz._id, meta: { title: quiz.title, type: quiz.type } });
    res.status(201).json({ success: true, data: quiz });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.user.role !== 'admin' && String(quiz.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized to update this quiz' });
    if (req.body.course) {
      const check = await courseAccess(req, req.body.course);
      if (check.message) return res.status(check.status).json({ success: false, message: check.message });
      req.body.instructor = check.course.instructor;
    }
    const updated = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await logEvent(req, 'quiz.updated', { targetType: 'quiz', targetId: updated._id, meta: { title: updated.title } });
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.user.role !== 'admin' && String(quiz.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized to delete this quiz' });
    await quiz.deleteOne();
    await logEvent(req, 'quiz.deleted', { targetType: 'quiz', targetId: quiz._id, meta: { title: quiz.title } });
    res.json({ success: true, data: {} });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.attemptQuiz = async (req, res) => {
  try {
    if (!Array.isArray(req.body.answers)) return res.status(400).json({ success: false, message: 'answers must be an array' });
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (!quiz.isPublished) return res.status(400).json({ success: false, message: 'This assessment is not available' });
    const course = await Course.findById(quiz.course).select('students');
    if (!course || !course.students.some((id) => String(id) === req.user.id)) return res.status(403).json({ success: false, message: 'Enroll in this course first' });
    let score = 0; quiz.questions.forEach((q, i) => { if (req.body.answers[i] === q.correctAnswer) score += q.points || 0; });
    quiz.attempts.push({ student: req.user.id, answers: req.body.answers, score, submittedAt: new Date() }); await quiz.save();
    await logEvent(req, 'quiz.attempted', { targetType: 'quiz', targetId: quiz._id, meta: { title: quiz.title, score } });
    res.json({ success: true, score, totalPoints: quiz.totalPoints });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getResults = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('attempts.student', 'firstName lastName email');
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.user.role === 'student') return res.json({ success: true, data: quiz.attempts.filter((a) => String(a.student?._id || a.student) === req.user.id).map((a) => ({ score: a.score, submittedAt: a.submittedAt })) });
    if (req.user.role === 'instructor' && String(quiz.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    res.json({ success: true, data: quiz.attempts });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
