import mongoose from 'mongoose';

// YouTube URL validation regex — stored reference only, never fetched.
const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w\-]{11}(&.*)?$/;

export function isValidYoutubeUrl(url) {
  return typeof url === 'string' && YOUTUBE_URL_PATTERN.test(url.trim());
}

const CourseSchema = new mongoose.Schema(
  {
    // Stable slug identifier — 'dsa' for the initial course.
    slug: {
      type: String,
      required: [true, 'Course slug is required'],
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Teacher-provided reference material for Gemini processing.
    // Extracted text from the uploaded PDF — the primary Gemini input.
    syllabus: {
      type: String,
      trim: true,
      default: '',
    },
    // Metadata about the uploaded PDF. Binary data is NOT stored in MongoDB.
    syllabusFileMeta: {
      originalName: { type: String, default: null },
      sizeBytes:    { type: Number, default: null },
      uploadedAt:   { type: Date,   default: null },
    },
    // Reference video URL — stored only, not fetched.
    // Transcript extraction is a future phase.
    youtubeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    // Processing lifecycle: draft → processing → ready | failed
    status: {
      type: String,
      enum: {
        values: ['draft', 'processing', 'ready', 'failed'],
        message: 'Status must be draft, processing, ready, or failed',
      },
      default: 'draft',
    },
    // Validated JSON structure from Gemini. Only present when status=ready.
    // Shape: { levels: [ { title, description, order, concepts: [...] } ] }
    generatedStructure: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // AI-generated daily teaching plan grounded in the syllabus.
    // Shape: [ { day, topics: [string], objective: string, estimatedMinutes: number } ]
    teachingPlan: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Last processing error message, if status=failed.
    processingError: {
      type: String,
      default: null,
    },
    // Teacher's explicit confirmation that structure is approved for student progression.
    confirmedAt: {
      type: Date,
      default: null,
    },
    // Teacher concept-completion state.
    // Each entry tracks which concepts (by order) have been marked taught in a level.
    // Source of truth: Course.generatedStructure (canonical curriculum).
    // Student unlock status is DERIVED dynamically — never stored separately.
    //
    // Shape: [{ levelOrder: Number, completedConceptOrders: [Number], updatedAt: Date }]
    // Identity: (courseId, levelOrder) is unique within the array.
    progression: {
      type: [
        {
          levelOrder: {
            type: Number,
            required: true,
            min: 1,
          },
          completedConceptOrders: {
            type: [Number],
            default: [],
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
          _id: false,
        },
      ],
      default: [],
    },
    // Always set from session — never from client request body.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
    },
  },
  {
    timestamps: true,
  }
);

// One DSA course per teacher. Prevents duplicates from repeated submissions.
CourseSchema.index({ slug: 1, createdBy: 1 }, { unique: true });

const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);

export default Course;
