import mongoose from 'mongoose';

const { Schema } = mongoose;

// Running verdict for one concept, recomputed after every quiz submission.
// Kyle reads conceptMastery[concept].posterior as priorAccuracyRate.
const ConceptMasteryEntrySchema = new Schema(
  {
    llr_total:  { type: Number, default: 0 },
    nAttempts:  { type: Number, default: 0 },
    verdict: {
      type: String,
      enum: ['INSUFFICIENT_DATA', 'MASTERY', 'KNOWLEDGE_GAP', 'DISENGAGED_GUESSING', 'DEVELOPING'],
      default: 'INSUFFICIENT_DATA',
    },
    // Posterior probability of mastery — used as priorAccuracyRate for
    // difficulty selection on the next quiz generation.
    posterior:      { type: Number, default: null },
    lastUpdatedAt:  { type: Date,   default: Date.now },
  },
  { _id: false },
);

const ConceptMasterySchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    // Keyed "concept::difficultyTier" → shrunk E_i estimate (ms).
    // Initialized to manual anchors on first attempt (cold start).
    expectedTimeAnchors:      { type: Map, of: Number, default: {} },
    expectedTimeSampleCounts: { type: Map, of: Number, default: {} },

    // Dedup guard: prevents re-processing the same QuizAttempt twice.
    countedAttemptIds: { type: [String], default: [] },

    // Rolling last-30 concepts seen — cold-start fallback for gap detection.
    recentConcepts: { type: [String], default: [] },

    // The live mastery map — keyed by concept string.
    conceptMastery: { type: Map, of: ConceptMasteryEntrySchema, default: {} },
  },
  { timestamps: true },
);

// Primary lookup: one mastery doc per student per course.
ConceptMasterySchema.index({ student: 1, course: 1 }, { unique: true });
ConceptMasterySchema.index({ 'conceptMastery.verdict': 1 });

const ConceptMastery =
  mongoose.models.ConceptMastery ||
  mongoose.model('ConceptMastery', ConceptMasterySchema);

export default ConceptMastery;
