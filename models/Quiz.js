const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: [String],
    correctAnswer: { type: Number, required: true },
    points: { type: Number, default: 1 }
  },
  { _id: true }
);

const attemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [Number],
    score: Number,
    submittedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Quiz title is required'], trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['quiz', 'exam'], default: 'quiz' },
    duration: { type: Number, default: 30 }, // minutes
    startAt: { type: Date }, // for exams: scheduled start
    questions: [questionSchema],
    totalPoints: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    attempts: [attemptSchema]
  },
  { timestamps: true }
);

quizSchema.pre('save', function (next) {
  if (this.isModified('questions')) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);
