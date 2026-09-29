const Course = require('../models/Course');
const User = require('../models/User');
const { logEvent } = require('../utils/audit');

const ensureAssignedInstructor = async (instructorId) => {
  if (!instructorId) return null;
  const instructor = await User.findOne({ _id: instructorId, role: 'instructor' }).select('_id firstName lastName email role');
  return instructor;
};

exports.getCourses = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student') query = { isPublished: true };
    if (req.user.role === 'instructor') query = { instructor: req.user.id };

    const courses = await Course.find(query)
      .populate('instructor', 'firstName lastName email role')
      .populate('students', 'firstName lastName email')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName email role')
      .populate('students', 'firstName lastName email')
      .populate('modules.materials');

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'instructor' && String(course.instructor?._id || course.instructor) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this course' });
    }
    if (req.user.role === 'student' && !course.isPublished && !course.students.some((s) => String(s._id) === req.user.id)) {
      return res.status(403).json({ success: false, message: 'This course is not available' });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, level, duration, price, thumbnail, isPublished } = req.body;
    let instructorId = req.body.instructor;

    if (req.user.role === 'admin') {
      if (!instructorId) return res.status(400).json({ success: false, message: 'Please assign an instructor to this course' });
      const instructor = await ensureAssignedInstructor(instructorId);
      if (!instructor) return res.status(400).json({ success: false, message: 'Selected instructor does not exist' });
    } else {
      instructorId = req.user.id;
    }

    const course = await Course.create({
      title, description, category, level, duration, price, thumbnail,
      isPublished: Boolean(isPublished), instructor: instructorId
    });

    await logEvent(req, 'course.created', { targetType: 'course', targetId: course._id, meta: { title: course.title, instructorId } });
    const populated = await Course.findById(course._id).populate('instructor', 'firstName lastName email role');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && String(course.instructor) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this course' });
    }

    const updates = { ...req.body };
    if (req.user.role === 'admin') {
      if (updates.instructor) {
        const instructor = await ensureAssignedInstructor(updates.instructor);
        if (!instructor) return res.status(400).json({ success: false, message: 'Selected instructor does not exist' });
      }
    } else {
      delete updates.instructor;
    }

    course = await Course.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('instructor', 'firstName lastName email role');

    await logEvent(req, 'course.updated', { targetType: 'course', targetId: course._id, meta: { title: course.title } });
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (req.user.role !== 'admin' && String(course.instructor) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this course' });
    }
    await course.deleteOne();
    await logEvent(req, 'course.deleted', { targetType: 'course', targetId: course._id, meta: { title: course.title } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.enrollCourse = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!course.isPublished) return res.status(400).json({ success: false, message: 'This course is not open for enrollment' });
    if (course.students.some((id) => String(id) === req.user.id)) return res.status(400).json({ success: false, message: 'Already enrolled in this course' });

    course.students.push(req.user.id);
    await course.save();
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { enrolledCourses: course._id } });
    await logEvent(req, 'course.enrolled', { targetType: 'course', targetId: course._id, meta: { title: course.title } });

    res.status(200).json({ success: true, message: 'Enrolled successfully', data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
