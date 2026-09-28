const Assignment = require('../models/Assignment');
const { logEvent } = require('../utils/audit');

// @desc    Get assignments, optionally filtered by course
// @route   GET /api/assignments?course=xxx
// @access  Private
exports.getAssignments = async (req, res) => {
  try {
    const { course } = req.query;
    const query = course ? { course } : {};
    const isStaff = req.user.role === 'instructor' || req.user.role === 'admin';

    let finder = Assignment.find(query)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName')
      .sort('-createdAt');

    // Staff see submissions with student names; students only see their own submission status
    if (isStaff) {
      finder = finder.populate('submissions.student', 'firstName lastName email');
    }

    const assignments = await finder;

    if (!isStaff) {
      assignments.forEach((a) => {
        a.submissions = a.submissions.filter((s) => s.student.toString() === req.user.id);
      });
    }

    res.status(200).json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
exports.getAssignment = async (req, res) => {
  try {
    const isStaff = req.user.role === 'instructor' || req.user.role === 'admin';
    let finder = Assignment.findById(req.params.id)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName');

    if (isStaff) {
      finder = finder.populate('submissions.student', 'firstName lastName email');
    }

    const assignment = await finder;
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (!isStaff) {
      assignment.submissions = assignment.submissions.filter((s) => s.student.toString() === req.user.id);
    }

    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private/Staff
exports.createAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.create({ ...req.body, instructor: req.user.id });
    logEvent(req, 'assessment.created', { targetType: 'assignment', targetId: assignment._id, meta: { title: assignment.title } });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private/Staff
exports.updateAssignment = async (req, res) => {
  try {
    let assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    if (req.user.role !== 'admin' && assignment.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this assignment' });
    }

    assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private/Staff
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    if (req.user.role !== 'admin' && assignment.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this assignment' });
    }

    await assignment.deleteOne();
    logEvent(req, 'assessment.deleted', { targetType: 'assignment', targetId: req.params.id, meta: { title: assignment.title } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit assignment (link to work). Resubmission overwrites the previous entry.
// @route   POST /api/assignments/:id/submit
// @access  Private/Student
exports.submitAssignment = async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'fileUrl is required' });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const existing = assignment.submissions.find((s) => s.student.toString() === req.user.id);
    if (existing) {
      existing.fileUrl = fileUrl;
      existing.submittedAt = new Date();
    } else {
      assignment.submissions.push({ student: req.user.id, fileUrl, submittedAt: new Date() });
    }

    await assignment.save();
    res.status(200).json({ success: true, data: assignment.submissions.filter((s) => s.student.toString() === req.user.id) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Grade a submission
// @route   PUT /api/assignments/:id/grade
// @access  Private/Staff
exports.gradeSubmission = async (req, res) => {
  try {
    const { studentId, grade, feedback } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const submission = assignment.submissions.find((s) => s.student.toString() === studentId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found for this student' });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    await assignment.save();

    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
