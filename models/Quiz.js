import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
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
        message: "Each question must have exactly 3 options.",
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
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
  },
  { _id: false },
);

const QuizSchema = new mongoose.Schema(
  {
    // Human-readable serial number within the level (1–5)
    serialNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Deterministic identity: courseId + levelOrder (matches Course.generatedStructure.levels[].order)
    // No Level model or collection — curriculum lives in Course.generatedStructure.
    levelOrder: {
      type: Number,
      required: true,
      min: 1,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    // Generated from video transcript via Gemini
    questions: {
      type: [QuestionSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "A quiz must have at least one question.",
      },
    },
  },
  { timestamps: true },
);

// One quiz per serial number per level per course
QuizSchema.index({ course: 1, levelOrder: 1, serialNumber: 1 }, { unique: true });

const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", QuizSchema);

export default Quiz;
