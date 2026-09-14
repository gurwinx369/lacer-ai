import mongoose from 'mongoose';

const AssignmentQuestionSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: Number,
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: (v) => v.length === 3,
        message: 'Each question must have exactly 3 options.',
      },
      required: true,
    },
    // 0-indexed position in options array
    correctAnswer: {
      type: Number,
      min: 0,
      max: 2,
      required: true,
    },
    // Required for concept-level mastery tracking
    concept: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
  },
  { _id: false }
);

const AssignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Deterministic identity: levelOrder matches Course.generatedStructure.levels[].order.
    // No Level model or collection — curriculum lives in Course.generatedStructure.
    levelOrder: {
      type: Number,
      required: true,
      min: 1,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    // ISO date string — availability enforced at API level, not DB constraint
    availableFrom: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    questions: {
      type: [AssignmentQuestionSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'An assignment must have at least one question.',
      },
    },
  },
  { timestamps: true }
);

// One assignment per level per course
AssignmentSchema.index({ course: 1, levelOrder: 1 }, { unique: true });

const Assignment =
  mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);

export default Assignment;
