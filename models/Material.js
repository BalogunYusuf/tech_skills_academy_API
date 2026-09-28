const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true
    },
    description: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['pdf', 'video', 'assignment', 'presentation', 'link'],
      required: true
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required']
    },
    filePublicId: String,
    fileSize: Number,
    module: {
      type: String,
      default: 'General'
    },
    accessLevel: {
      type: String,
      enum: ['enrolled', 'all', 'scheduled'],
      default: 'enrolled'
    },
    releaseDate: Date,
    isPublished: {
      type: Boolean,
      default: true
    },
    isDraft: {
      type: Boolean,
      default: false
    },
    downloads: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
