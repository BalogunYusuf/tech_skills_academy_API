const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { logEvent } = require('../utils/audit');

const ownedCourse = async (req, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) return { error: 'Course not found' };
  if (req.user.role !== 'admin' && String(course.instructor) !== req.user.id) return { error: 'You are not assigned to this course', status: 403 };
  return { course };
};

exports.getLessons = async (req, res) => {
  try {
    const query = { course: req.query.course };
    if (!query.course) return res.status(400).json({ success: false, message: 'course is required' });
    const course = await Course.findById(query.course);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (req.user.role === 'student' && !course.isPublished && !course.students.some((id) => String(id) === req.user.id)) return res.status(403).json({ success: false, message: 'Course unavailable' });
    if (req.user.role === 'student' && !course.students.some((id) => String(id) === req.user.id)) return res.status(403).json({ success: false, message: 'Enroll in this course to view lessons' });
    if (req.user.role === 'instructor' && String(course.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'You are not assigned to this course' });
    const lessons = await Lesson.find(query).sort({ order: 1, createdAt: 1 }).populate('instructor', 'firstName lastName');
    res.json({ success: true, count: lessons.length, data: lessons });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createLesson = async (req, res) => {
  try {
    const { course, title, content, module, order, isPublished } = req.body;
    if (!course || !title) return res.status(400).json({ success: false, message: 'course and title are required' });
    const check = await ownedCourse(req, course);
    if (check.error) return res.status(check.status || 404).json({ success: false, message: check.error });
    const lesson = await Lesson.create({ course, title, content, module, order: Number(order || 0), isPublished: isPublished !== false, instructor: req.user.id });
    await logEvent(req, 'lesson.created', { targetType: 'lesson', targetId: lesson._id, meta: { title, course } });
    res.status(201).json({ success: true, data: lesson });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
    if (req.user.role !== 'admin' && String(lesson.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    delete req.body.instructor;
    const updated = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await logEvent(req, 'lesson.updated', { targetType: 'lesson', targetId: lesson._id, meta: { title: updated.title } });
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
    if (req.user.role !== 'admin' && String(lesson.instructor) !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    await lesson.deleteOne();
    await logEvent(req, 'lesson.deleted', { targetType: 'lesson', targetId: lesson._id, meta: { title: lesson.title } });
    res.json({ success: true, data: {} });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
