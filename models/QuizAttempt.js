import mongoose from 'mongoose';

// One entry per question answered — concept stored here so mastery calc
// never needs to re-join Quiz at query time.
const AnswerSchema = new mongoose.Schema(
  {
    // Matches Question.serialNumber in Quiz
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
    // Required by the Bayesian grading engine for E_i shrinkage + speed-bucket logic.
    // Store 0 for skipped/unanswered questions; gradeAttempt treats >70000ms as UNATTEMPTED.
    responseTimeMs: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const QuizAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
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
      type: [AnswerSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'A quiz attempt must include at least one answer.',
      },
    },
    // Denormalised for fast dashboard queries — avoids re-scanning answers[]
    score: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 1 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index: fast per-student, per-quiz, per-course lookups
QuizAttemptSchema.index({ student: 1, quiz: 1 });
QuizAttemptSchema.index({ student: 1, course: 1 });
// ponytail: no unique constraint — multiple attempts per quiz are intentional for improvement tracking

const QuizAttempt =
  mongoose.models.QuizAttempt ||
  mongoose.model('QuizAttempt', QuizAttemptSchema);

export default QuizAttempt;
