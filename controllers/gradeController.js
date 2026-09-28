const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');

// @desc    Get grades - students see their own, staff see everything
// @route   GET /api/grades
// @access  Private
exports.getGrades = async (req, res) => {
  try {
    const isStaff = req.user.role === 'instructor' || req.user.role === 'admin';
    const results = [];

    const quizProjection = isStaff ? '' : '-questions.correctAnswer';
    const quizzes = await Quiz.find({}, quizProjection).populate('course', 'title').populate('attempts.student', 'firstName lastName email');
    quizzes.forEach((q) => {
      q.attempts.forEach((a) => {
        if (isStaff || (a.student && a.student._id.toString() === req.user.id)) {
          results.push({
            id: `${q._id}-${a._id}`,
            type: q.type === 'exam' ? 'Exam' : 'Quiz',
            assessment: q.title,
            course: q.course ? q.course.title : '—',
            student: a.student ? `${a.student.firstName || ''} ${a.student.lastName || ''}`.trim() : '—',
            score: a.score,
            totalPoints: q.totalPoints,
            feedback: null,
            submittedAt: a.submittedAt
          });
        }
      });
    });

    const assignments = await Assignment.find().populate('course', 'title').populate('submissions.student', 'firstName lastName email');
    assignments.forEach((a) => {
      a.submissions.forEach((s) => {
        if (isStaff || (s.student && s.student._id.toString() === req.user.id)) {
          results.push({
            id: `${a._id}-${s._id}`,
            type: 'Assignment',
            assessment: a.title,
            course: a.course ? a.course.title : '—',
            student: s.student ? `${s.student.firstName || ''} ${s.student.lastName || ''}`.trim() : '—',
            score: s.grade === undefined ? null : s.grade,
            totalPoints: a.totalPoints,
            feedback: s.feedback || null,
            submittedAt: s.submittedAt
          });
        }
      });
    });

    results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.status(200).json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
