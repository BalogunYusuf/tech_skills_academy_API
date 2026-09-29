const User = require('../models/User');
const Course = require('../models/Course');
const Material = require('../models/Material');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');

exports.getStudentDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('enrolledCourses', 'title category level instructor isPublished');
    const enrolledIds = (user.enrolledCourses || []).map((c) => c._id);
    const [materials, lessons, quizzes, assignments, announcements, activity] = await Promise.all([
      Material.find({ course: { $in: enrolledIds }, isPublished: true }).select('title type fileUrl createdAt course').populate('course', 'title').sort('-createdAt').limit(8),
      Lesson.find({ course: { $in: enrolledIds }, isPublished: true }).select('title module createdAt course').populate('course', 'title').sort('-createdAt').limit(6),
      Quiz.find({ course: { $in: enrolledIds }, isPublished: true }).select('title type duration startAt totalPoints attempts'),
      Assignment.find({ course: { $in: enrolledIds } }).select('title dueDate totalPoints submissions course').populate('course', 'title'),
      Announcement.find({ $or: [{ course: { $in: enrolledIds } }, { course: { $exists: false } }, { course: null }] }).sort('-createdAt').limit(6),
      AuditLog.find({ actor: req.user.id }).sort('-createdAt').limit(8)
    ]);

    const attemptedQuizIds = new Set();
    quizzes.forEach((q) => (q.attempts || []).forEach((a) => { if (String(a.student) === req.user.id) attemptedQuizIds.add(String(q._id)); }));
    const submittedAssignmentIds = new Set();
    assignments.forEach((a) => (a.submissions || []).forEach((s) => { if (String(s.student) === req.user.id) submittedAssignmentIds.add(String(a._id)); }));

    const pendingAssessments = quizzes.filter((q) => q.type === 'quiz' && !attemptedQuizIds.has(String(q._id))).length + assignments.filter((a) => !submittedAssignmentIds.has(String(a._id))).length;
    const upcomingExams = quizzes.filter((q) => q.type === 'exam').length;

    res.json({ success: true, data: {
      enrolledCourses: enrolledIds.length,
      materials: materials.length,
      lessons: lessons.length,
      pendingAssessments,
      upcomingExams,
      courses: user.enrolledCourses,
      announcements,
      recentMaterials: materials,
      recentLessons: lessons,
      recentActivity: activity
    }});
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getTeacherDashboard = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).select('_id title category level students isPublished createdAt').sort('-createdAt');
    const courseIds = courses.map((c) => c._id);
    const [materials, lessons, quizzes, assignments, studentsCount, activity] = await Promise.all([
      Material.countDocuments({ instructor: req.user.id }),
      Lesson.countDocuments({ instructor: req.user.id }),
      Quiz.countDocuments({ instructor: req.user.id }),
      Assignment.countDocuments({ instructor: req.user.id }),
      User.countDocuments({ enrolledCourses: { $in: courseIds } }),
      AuditLog.find({ actor: req.user.id }).sort('-createdAt').limit(8)
    ]);

    const myAssignments = await Assignment.find({ instructor: req.user.id }).populate('submissions.student', 'firstName lastName email').select('title submissions');
    let pendingScores = 0; const recentSubmissions = [];
    myAssignments.forEach((a) => (a.submissions || []).forEach((s) => {
      if (s.grade === undefined || s.grade === null) { pendingScores += 1; recentSubmissions.push({ assignmentId: a._id, assignmentTitle: a.title, student: s.student, fileUrl: s.fileUrl, submittedAt: s.submittedAt }); }
    }));
    recentSubmissions.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const announcements = await Announcement.find({ instructor: req.user.id }).sort('-createdAt').limit(5);

    res.json({ success: true, data: {
      courses: courses.length, courseList: courses, students: studentsCount, materials, lessons,
      assessments: quizzes + assignments, quizzes, assignments, pendingScores,
      recentSubmissions: recentSubmissions.slice(0,6), announcements, recentActivity: activity
    }});
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const [students, instructors, admins, courses, materials, lessons, quizzes, assignments, announcements] = await Promise.all([
      User.countDocuments({ role: 'student' }), User.countDocuments({ role: 'instructor' }), User.countDocuments({ role: 'admin' }),
      Course.countDocuments(), Material.countDocuments(), Lesson.countDocuments(), Quiz.countDocuments(), Assignment.countDocuments(), Announcement.countDocuments()
    ]);
    const [recentUsers, recentAudit, recentCourses] = await Promise.all([
      User.find().select('firstName lastName email role createdAt').sort('-createdAt').limit(8),
      AuditLog.find().sort('-createdAt').limit(12),
      Course.find().populate('instructor', 'firstName lastName').select('title category isPublished createdAt instructor').sort('-createdAt').limit(8)
    ]);
    res.json({ success: true, data: {
      students, instructors, admins, courses, materials, lessons, assessments: quizzes + assignments, quizzes, assignments, announcements,
      recentUsers, recentAudit, recentCourses
    }});
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
