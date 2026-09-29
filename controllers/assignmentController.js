const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const { logEvent } = require('../utils/audit');

const checkCourseAccess = async (req, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) return { status: 404, message: 'Course not found' };
  if (req.user.role !== 'admin' && String(course.instructor) !== req.user.id) return { status: 403, message: 'You are not assigned to this course' };
  return { course };
};

exports.getAssignments = async (req, res) => {
  try {
    const query = req.query.course ? { course: req.query.course } : {};
    const isStaff = ['instructor', 'admin'].includes(req.user.role);
    if (req.user.role === 'instructor') query.instructor = req.user.id;
    if (req.user.role === 'student') {
      const User = require('../models/User');
      const user = await User.findById(req.user.id).select('enrolledCourses');
      query.course = { $in: user.enrolledCourses || [] };
    }
    let finder = Assignment.find(query).populate('course', 'title').populate('instructor', 'firstName lastName').sort('-createdAt');
    if (isStaff) finder = finder.populate('submissions.student', 'firstName lastName email');
    const assignments = await finder;
    if (!isStaff) assignments.forEach((a) => { a.submissions = a.submissions.filter((s) => String(s.student) === req.user.id); });
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAssignment = async (req, res) => {
  try {
    const isStaff = ['instructor', 'admin'].includes(req.user.role);
    let finder = Assignment.findById(req.params.id).populate('course', 'title').populate('instructor', 'firstName lastName');
    if (isStaff) finder = finder.populate('submissions.student', 'firstName lastName email');
    const assignment = await finder;
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.user.role === 'instructor' && String(assignment.instructor?._id || assignment.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!isStaff) assignment.submissions = assignment.submissions.filter((s) => String(s.student) === req.user.id);
    res.json({ success: true, data: assignment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createAssignment = async (req, res) => {
  try {
    const check = await checkCourseAccess(req, req.body.course);
    if (check.message) return res.status(check.status).json({ success: false, message: check.message });
    const assignment = await Assignment.create({ ...req.body, instructor: check.course.instructor });
    await logEvent(req, 'assignment.created', { targetType: 'assignment', targetId: assignment._id, meta: { title: assignment.title, course: assignment.course } });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.user.role !== 'admin' && String(assignment.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized to update this assignment' });
    if (req.body.course) {
      const check = await checkCourseAccess(req, req.body.course);
      if (check.message) return res.status(check.status).json({ success: false, message: check.message });
      req.body.instructor = check.course.instructor;
    }
    const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await logEvent(req, 'assignment.updated', { targetType: 'assignment', targetId: updated._id, meta: { title: updated.title } });
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.user.role !== 'admin' && String(assignment.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized to delete this assignment' });
    await assignment.deleteOne();
    await logEvent(req, 'assignment.deleted', { targetType: 'assignment', targetId: assignment._id, meta: { title: assignment.title } });
    res.json({ success: true, data: {} });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.submitAssignment = async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ success: false, message: 'fileUrl is required' });
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    const existing = assignment.submissions.find((s) => String(s.student) === req.user.id);
    if (existing) { existing.fileUrl = fileUrl; existing.submittedAt = new Date(); }
    else assignment.submissions.push({ student: req.user.id, fileUrl, submittedAt: new Date() });
    await assignment.save();
    await logEvent(req, 'assignment.submitted', { targetType: 'assignment', targetId: assignment._id, meta: { title: assignment.title } });
    res.json({ success: true, data: assignment.submissions.filter((s) => String(s.student) === req.user.id) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const { studentId, grade, feedback } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.user.role !== 'admin' && String(assignment.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    const submission = assignment.submissions.find((s) => String(s.student) === studentId);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found for this student' });
    submission.grade = grade; submission.feedback = feedback;
    await assignment.save();
    await logEvent(req, 'assignment.graded', { targetType: 'assignment', targetId: assignment._id, meta: { studentId, grade } });
    res.json({ success: true, data: assignment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
