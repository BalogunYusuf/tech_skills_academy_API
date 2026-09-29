const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  module: { type: String, default: 'General' },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

lessonSchema.index({ course: 1, order: 1 });
module.exports = mongoose.model('Lesson', lessonSchema);
