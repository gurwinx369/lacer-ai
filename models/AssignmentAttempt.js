import mongoose from 'mongoose';

// One entry per question answered — concept stored here so mastery calc
// never needs to re-join Assignment at query time.
const AssignmentAnswerSchema = new mongoose.Schema(
  {
    // Matches AssignmentQuestion.serialNumber in Assignment
    serialNumber: { type: Number, required: true },
    concept: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    // 0-indexed; null = skipped/unanswered
    selectedAnswer: { type: Number, min: 0, max: 2, default: null },
    correctAnswer: { type: Number, min: 0, max: 2, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

const AssignmentAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    answers: {
      type: [AssignmentAnswerSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'An assignment attempt must include at least one answer.',
      },
    },
    // Denormalised for fast dashboard queries — avoids re-scanning answers[]
    score: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 1 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One submission per student per assignment — assignments are not retakeable
// ponytail: relax this to allow resubmission if spec changes
AssignmentAttemptSchema.index(
  { student: 1, assignment: 1 },
  { unique: true }
);
AssignmentAttemptSchema.index({ student: 1, course: 1 });

const AssignmentAttempt =
  mongoose.models.AssignmentAttempt ||
  mongoose.model('AssignmentAttempt', AssignmentAttemptSchema);

export default AssignmentAttempt;
