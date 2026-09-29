const User = require('../models/User');
const { logEvent } = require('../utils/audit');

// @desc    Get logged-in user's profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('enrolledCourses', 'title thumbnail');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update logged-in user's profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'avatar', 'department'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all students (staff only)
// @route   GET /api/users/students
// @access  Private/Staff
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').populate('enrolledCourses', 'title category');
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a staff (instructor/admin) account
// @route   POST /api/users/staff
// @access  Private/Admin
exports.createStaff = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'email, password, firstName, and lastName are required'
      });
    }

    const staffRole = role === 'admin' ? 'admin' : 'instructor';

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: staffRole,
      department,
      staffId: `STF${Date.now()}`
    });

    await logEvent(req, 'user.staff_created', { targetType: 'user', targetId: user._id, meta: { email: user.email, role: user.role } });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        staffId: user.staffId,
        department: user.department
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all staff accounts (instructor/admin) - names, roles, IDs only
// @route   GET /api/users/staff
// @access  Private/Admin
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ['instructor', 'admin'] } })
      .select('-password')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: staff.length, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
