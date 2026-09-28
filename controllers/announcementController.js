const Announcement = require('../models/Announcement');

// @desc    Get announcements, optionally filtered by course
// @route   GET /api/announcements?course=xxx
// @access  Private
exports.getAnnouncements = async (req, res) => {
  try {
    const { course } = req.query;
    const query = { isPublished: true, ...(course && { course }) };

    const announcements = await Announcement.find(query)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: announcements.length, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private/Staff
exports.createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({ ...req.body, instructor: req.user.id });
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Staff
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    if (req.user.role !== 'admin' && announcement.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this announcement' });
    }

    await announcement.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
