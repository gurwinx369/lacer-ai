/**
 * service.js — orchestrates engine + MongoDB for concept mastery.
 *
 * Called by the quiz-submit route after a QuizAttempt is saved.
 * Supplies all history to the pure engine functions; persists results atomically.
 */

import { connectDB } from '../../lib/db.js';
import ConceptMastery from '../../models/ConceptMastery.js';
import { computeEiIncremental, gradeAttempt, classifyConcept } from './engine.js';

/**
 * Grade a submitted quiz attempt and update the student's concept mastery.
 *
 * @param {string} studentId     - Mongoose ObjectId string
 * @param {string} courseId      - Mongoose ObjectId string
 * @param {string} quizAttemptId - used as dedup key to prevent double-processing
 * @param {Array<{
 *   concept: string,
 *   difficulty: 'easy'|'medium'|'hard',
 *   isCorrect: boolean,
 *   responseTimeMs: number,   // ms; 0 if not tracked (treated as UNATTEMPTED-safe)
 * }>} answers
 * @returns {Promise<{ conceptVerdicts: Object }>}
 */
export async function gradeAndPersist(studentId, courseId, quizAttemptId, answers) {
  await connectDB();

  // Upsert the mastery doc so it exists before we read it.
  // findOneAndUpdate with $setOnInsert handles first-doc concurrency safely.
  await ConceptMastery.findOneAndUpdate(
    { student: studentId, course: courseId },
    { $setOnInsert: { student: studentId, course: courseId } },
    { upsert: true },
  );

  const doc = await ConceptMastery.findOne({ student: studentId, course: courseId }).lean();

  // Dedup: skip if this attempt was already processed.
  if (doc.countedAttemptIds?.includes(quizAttemptId)) {
    return { conceptVerdicts: _extractVerdicts(doc.conceptMastery) };
  }

  // ── Layer 0 + 1: resolve E_i and grade each answer ───────────────────────
  const allGradedAttempts = [];
  const newEiUpdates = {}; // "concept::tier" -> {newEi, newN}

  for (const ans of answers) {
    const tier = ans.difficulty;
    const eiKey = `${ans.concept}::${tier}`;

    // Read current state OR our running update if multiple questions in same tier
    const eiCurrent = newEiUpdates[eiKey]?.newEi ?? _mapGet(doc.expectedTimeAnchors, eiKey);
    const eiN       = newEiUpdates[eiKey]?.newN ?? (_mapGet(doc.expectedTimeSampleCounts, eiKey) ?? 0);

    // Resolve E_i for grading; compute updated E_i if we have a real time.
    const { ei: eiMs } = computeEiIncremental(eiCurrent, eiN, tier);
    const { ei: newEi, n: newN } = computeEiIncremental(eiCurrent, eiN, tier, ans.responseTimeMs || null);

    newEiUpdates[eiKey] = { newEi, newN };

    let tMsForGrading;
    if (ans.responseTimeMs === null) {
      tMsForGrading = null; // Assignment mode: no timing
    } else if (ans.responseTimeMs === 0 || ans.responseTimeMs === undefined) {
      tMsForGrading = 70001; // Skipped or unspecified quiz question
    } else {
      tMsForGrading = ans.responseTimeMs;
    }

    allGradedAttempts.push({
      concept: ans.concept,
      tier,
      graded: gradeAttempt(tMsForGrading, eiMs, ans.isCorrect),
    });
  }

  // ── Layer 2: classify each concept (pool prior + new attempts) ────────────
  const conceptVerdicts = {};
  // Group new graded attempts by concept
  const newByConceptMap = {};
  for (const entry of allGradedAttempts) {
    (newByConceptMap[entry.concept] ||= []).push(entry.graded);
  }

  const conceptMasteryMap = doc.conceptMastery instanceof Map
    ? doc.conceptMastery
    : new Map(Object.entries(doc.conceptMastery || {}));

  for (const [concept, newAttempts] of Object.entries(newByConceptMap)) {
    // Prior history isn't stored attempt-by-attempt in this model —
    // we store the running LLR total and re-synthesise a single "prior" entry
    // that carries the accumulated evidence. This is mathematically equivalent
    // to pooling all raw prior attempts when n >= 3 is already reached.
    // ponytail: synthesised-prior approach; switch to full attempt log if finer
    //           temporal granularity is ever needed.
    const prior = conceptMasteryMap.get(concept);
    const priorAttempts = prior
      ? [{ speedBucket: 'MEDIUM', rgbFlag: false, llrContribution: prior.llr_total, wasCorrect: (prior.posterior ?? 0) >= 0.5, _isSynthesised: true }].filter(() => prior.nAttempts >= 3)
      : [];

    const result = classifyConcept([...priorAttempts, ...newAttempts]);
    conceptVerdicts[concept] = result;
  }

  // ── Atomic write ──────────────────────────────────────────────────────────
  const setOps = {};

  for (const [eiKey, entry] of Object.entries(newEiUpdates)) {
    setOps[`expectedTimeAnchors.${eiKey}`]      = entry.newEi;
    setOps[`expectedTimeSampleCounts.${eiKey}`] = entry.newN;
  }

  for (const [concept, verdict] of Object.entries(conceptVerdicts)) {
    setOps[`conceptMastery.${concept}`] = {
      llr_total:     verdict.llr_total ?? 0,
      nAttempts:     verdict.nAttempts,
      verdict:       verdict.verdict,
      posterior:     verdict.posterior ?? null,
      lastUpdatedAt: new Date(),
    };
  }

  await ConceptMastery.updateOne(
    { student: studentId, course: courseId },
    {
      $set: setOps,
      $addToSet: { countedAttemptIds: quizAttemptId },
      $push: {
        recentConcepts: {
          $each: [...new Set(answers.map(a => a.concept))],
          $position: 0,
          $slice: 30,
        },
      },
    },
  );

  return { conceptVerdicts };
}

/**
 * Read one student's concept mastery map (teacher analytics).
 *
 * @param {string} studentId
 * @param {string} courseId
 * @returns {Promise<Object|null>} raw conceptMastery map or null if not found
 */
export async function getConceptMastery(studentId, courseId) {
  await connectDB();
  const doc = await ConceptMastery
    .findOne({ student: studentId, course: courseId })
    .select('conceptMastery')
    .lean();
  return doc ? _extractVerdicts(doc.conceptMastery) : null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function _mapGet(mapOrObj, key) {
  if (!mapOrObj) return undefined;
  return mapOrObj instanceof Map ? mapOrObj.get(key) : mapOrObj[key];
}

function _extractVerdicts(masteryMapOrObj) {
  if (!masteryMapOrObj) return {};
  const entries = masteryMapOrObj instanceof Map
    ? [...masteryMapOrObj.entries()]
    : Object.entries(masteryMapOrObj);
  return Object.fromEntries(
    entries.map(([concept, entry]) => [concept, {
      verdict:   entry.verdict,
      posterior: entry.posterior,
      nAttempts: entry.nAttempts,
    }])
  );
}

