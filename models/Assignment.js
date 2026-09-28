const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fileUrl: String,
    submittedAt: {
      type: Date,
      default: Date.now
    },
    grade: Number,
    feedback: String
  },
  { _id: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
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
    dueDate: Date,
    totalPoints: {
      type: Number,
      default: 100
    },
    submissions: [submissionSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
