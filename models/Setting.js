const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'platform' },
    siteName: { type: String, default: 'TechSkills Academy' },
    supportEmail: { type: String, default: '' },
    registrationOpen: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    defaultSession: { type: String, default: '2026/2027' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
