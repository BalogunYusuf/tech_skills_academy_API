const User = require('../models/User');
const Course = require('../models/Course');
const Material = require('../models/Material');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');

// @desc    Student dashboard aggregates
// @route   GET /api/dashboard/student
// @access  Private/Student
exports.getStudentDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('enrolledCourses', 'title category level');
    const enrolledIds = (user.enrolledCourses || []).map((c) => c._id);

    const [materials, quizzes, assignments, announcements] = await Promise.all([
      Material.find({ isPublished: true }).select('title type fileUrl createdAt').populate('course', 'title').sort('-createdAt').limit(8),
      Quiz.find({ isPublished: true }).select('title type duration startAt totalPoints attempts.course'),
      Assignment.find().select('title dueDate totalPoints submissions')
    ]);

    const attemptedQuizIds = new Set();
    quizzes.forEach((q) => q.attempts.forEach((a) => {
      if (a.student && a.student.toString() === req.user.id) attemptedQuizIds.add(q._id.toString());
    }));

    const submittedAssignmentIds = new Set();
    assignments.forEach((a) => a.submissions.forEach((s) => {
      if (s.student && s.student.toString() === req.user.id) submittedAssignmentIds.add(a._id.toString());
    }));

    const pendingAssessments =
      quizzes.filter((q) => q.type === 'quiz' && !attemptedQuizIds.has(q._id.toString())).length +
      assignments.filter((a) => !submittedAssignmentIds.has(a._id.toString())).length;

    res.status(200).json({
      success: true,
      data: {
        enrolledCourses: enrolledIds.length,
        materials: materials.length,
        pendingAssessments,
        upcomingExams: quizzes.filter((q) => q.type === 'exam').length,
        courses: user.enrolledCourses,
        announcements: announcements.slice(0, 6),
        recentMaterials: materials
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Teacher dashboard aggregates
// @route   GET /api/dashboard/teacher
// @access  Private/Staff
exports.getTeacherDashboard = async (req, res) => {
  try {
    const courseIds = (await Course.find({ instructor: req.user.id }).select('_id')).map((c) => c._id);

    const [coursesCount, materialsCount, quizzesCount, assignmentsCount, studentsCount] = await Promise.all([
      Course.countDocuments({ instructor: req.user.id }),
      Material.countDocuments({ instructor: req.user.id }),
      Quiz.countDocuments({ instructor: req.user.id }),
      Assignment.countDocuments({ instructor: req.user.id }),
      User.countDocuments({ enrolledCourses: { $in: courseIds } })
    ]);

    const myAssignments = await Assignment.find({ instructor: req.user.id })
      .populate('submissions.student', 'firstName lastName email')
      .select('title submissions');
    let pendingScores = 0;
    const recentSubmissions = [];
    myAssignments.forEach((a) =>
      a.submissions.forEach((s) => {
        if (s.grade === undefined || s.grade === null) {
          pendingScores += 1;
          if (recentSubmissions.length < 6) {
            recentSubmissions.push({
              assignmentId: a._id,
              assignmentTitle: a.title,
              student: s.student,
              fileUrl: s.fileUrl,
              submittedAt: s.submittedAt
            });
          }
        }
      })
    );
    recentSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const announcements = await Announcement.find({ instructor: req.user.id }).sort('-createdAt').limit(5);

    res.status(200).json({
      success: true,
      data: {
        courses: coursesCount,
        students: studentsCount,
        materials: materialsCount,
        assessments: quizzesCount + assignmentsCount,
        pendingScores,
        recentSubmissions: recentSubmissions.slice(0, 6),
        announcements
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin dashboard aggregates
// @route   GET /api/dashboard/admin
// @access  Private/Admin
exports.getAdminDashboard = async (req, res) => {
  try {
    const [students, instructors, admins, courses, materials, quizzes, assignments, announcements] =
      await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'instructor' }),
        User.countDocuments({ role: 'admin' }),
        Course.countDocuments(),
        Material.countDocuments(),
        Quiz.countDocuments(),
        Assignment.countDocuments(),
        Announcement.countDocuments()
      ]);

    const recentUsers = await User.find().select('firstName lastName email role createdAt').sort('-createdAt').limit(6);
    const recentAudit = await AuditLog.find().sort('-createdAt').limit(8);
    const recentCourses = await Course.find().populate('instructor', 'firstName lastName').select('title category isPublished createdAt').sort('-createdAt').limit(5);

    res.status(200).json({
      success: true,
      data: {
        students,
        instructors,
        admins,
        courses,
        materials,
        assessments: quizzes + assignments,
        announcements,
        recentUsers,
        recentAudit,
        recentCourses
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
