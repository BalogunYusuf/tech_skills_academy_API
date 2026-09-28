const Setting = require('../models/Setting');

const getSettingsDoc = async () => {
  let doc = await Setting.findOne({ key: 'platform' });
  if (!doc) doc = await Setting.create({ key: 'platform' });
  return doc;
};

// @desc    Get platform settings (public: safe fields only)
// @route   GET /api/settings
// @access  Public
exports.getSettings = async (req, res) => {
  try {
    const doc = await getSettingsDoc();
    res.status(200).json({
      success: true,
      data: {
        siteName: doc.siteName,
        supportEmail: doc.supportEmail,
        registrationOpen: doc.registrationOpen,
        maintenanceMode: doc.maintenanceMode,
        defaultSession: doc.defaultSession
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update platform settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
  try {
    const doc = await getSettingsDoc();
    const allowed = ['siteName', 'supportEmail', 'registrationOpen', 'maintenanceMode', 'defaultSession'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) doc[field] = req.body[field];
    });
    await doc.save();
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
