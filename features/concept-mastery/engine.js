/**
 * engine.js — Bayesian concept mastery math.
 *
 * Pure functions, zero I/O. Ported directly from kyle-ai/core/behavior_engine.py.
 * All constants, branch order, and likelihood table are unchanged from the
 * verified reference. Only difference: JS instead of Python.
 *
 * Three layers:
 *   Layer 0 — E_i:  empirical-Bayes shrinkage of per-(concept × tier) expected time
 *   Layer 1 — grade: per-attempt grading → speedBucket + llrContribution
 *   Layer 2 — classify: pooled LLR → mastery verdict + posterior
 */

// Layer 0 constants
const MANUAL_ANCHORS_MS = { easy: 12000, medium: 20000, hard: 32000 };
const SHRINK_W = 10;

// Layer 1 constants
const LIKELIHOOD = {
  FAST:   { knows_correct: 0.55, knows_wrong: 0.15, guess_correct: 0.50, guess_wrong: 0.45 },
  MEDIUM: { knows_correct: 0.35, knows_wrong: 0.35, guess_correct: 0.30, guess_wrong: 0.30 },
  SLOW:   { knows_correct: 0.08, knows_wrong: 0.35, guess_correct: 0.15, guess_wrong: 0.15 },
  GRACE:  { knows_correct: 0.02, knows_wrong: 0.15, guess_correct: 0.05, guess_wrong: 0.10 },
};
const P_CORRECT_KNOWS = 0.92;
const P_WRONG_KNOWS   = 0.08;
// ponytail: nOptions=3 hardcoded per Quiz schema validator — update if schema changes
const N_OPTIONS = 3;

// ─── Layer 0 ────────────────────────────────────────────────────────────────

/**
 * Incremental empirical-Bayes shrinkage for expected response time.
 *
 * @param {number|null} eiCurrent   - stored blended value (null = never seen)
 * @param {number}      sampleCount - how many real observations produced eiCurrent
 * @param {string}      tier        - "easy" | "medium" | "hard"
 * @param {number|null} [observedMs] - new observation; omit to just resolve current E_i
 * @returns {{ ei: number, n: number }}
 */
export function computeEiIncremental(eiCurrent, sampleCount, tier, observedMs = null) {
  const anchor = MANUAL_ANCHORS_MS[tier];
  if (eiCurrent == null || sampleCount === 0) {
    eiCurrent = anchor;
    sampleCount = 0;
  }
  if (observedMs == null) return { ei: eiCurrent, n: sampleCount };
  const ei = (eiCurrent * (SHRINK_W + sampleCount) + observedMs) / (SHRINK_W + sampleCount + 1);
  return { ei, n: sampleCount + 1 };
}

// ─── Layer 1 ────────────────────────────────────────────────────────────────

function speedBucket(tMs, ri) {
  if (tMs > 70000) return 'UNATTEMPTED';
  if (tMs >= 60000) return 'GRACE';
  if (ri <= 0.5)    return 'FAST';
  if (ri <= 1.3)    return 'MEDIUM';
  return 'SLOW';
}

/**
 * Grade one quiz answer.
 *
 * @param {number}  tMs        - student response time (ms)
 * @param {number}  eiMs       - resolved E_i for this (concept, tier)
 * @param {boolean} wasCorrect
 * @returns {{ speedBucket: string, rgbFlag: boolean, llrContribution: number|null }}
 */
export function gradeAttempt(tMs, eiMs, wasCorrect) {
  let bucket;
  let rgbFlag = false;

  if (tMs === null) {
    bucket = 'MEDIUM'; // Neutral speed bucket for untimed assignments
  } else {
    const ri = tMs / eiMs;
    bucket = speedBucket(tMs, ri);
    rgbFlag = tMs < Math.max(3000, 0.10 * eiMs);
  }

  if (bucket === 'UNATTEMPTED') {
    return { speedBucket: bucket, rgbFlag, llrContribution: null, wasCorrect };
  }

  const pCorrectGuess = 1 / N_OPTIONS;
  const pWrongGuess   = 1 - pCorrectGuess;
  const L = LIKELIHOOD[bucket];

  const pKnows = wasCorrect
    ? L.knows_correct * P_CORRECT_KNOWS
    : L.knows_wrong   * P_WRONG_KNOWS;

  const pGuess = wasCorrect
    ? L.guess_correct * pCorrectGuess
    : L.guess_wrong   * pWrongGuess;

  return {
    speedBucket: bucket,
    rgbFlag,
    llrContribution: Math.log(pKnows / pGuess),
    wasCorrect,
  };
}

// ─── Layer 2 ────────────────────────────────────────────────────────────────

/**
 * Classify a concept from all graded attempts (prior + new, pooled).
 *
 * @param {Array<{ speedBucket, rgbFlag, llrContribution, wasCorrect, nOptions? }>} attempts
 * @returns {{ verdict, nAttempts, posterior?, llr_total?, pChance?, rgbCount? }}
 */
export function classifyConcept(attempts) {
  const attempted = attempts.filter(a => a.speedBucket !== 'UNATTEMPTED');
  const n = attempted.length;

  if (n < 3) return { verdict: 'INSUFFICIENT_DATA', nAttempts: n };

  const rgbCount = attempted.filter(a => a.rgbFlag).length;
  if (rgbCount / n >= 2 / 3) {
    return { verdict: 'DISENGAGED_GUESSING', nAttempts: n, rgbCount };
  }

  const llr_total = attempted.reduce((sum, a) => sum + (a.llrContribution ?? 0), 0);
  const posterior = 1 / (1 + Math.exp(-llr_total));

  const fastCorrect = attempted.filter(a => a.speedBucket === 'FAST' && a.wasCorrect);
  let pChance = null;
  let binomialRejectsLuck = true;
  if (fastCorrect.length > 0) {
    pChance = fastCorrect.reduce((p) => p * (1 / N_OPTIONS), 1.0);
    binomialRejectsLuck = pChance < 0.05;
  }

  const wrong = attempted.filter(a => !a.wasCorrect);
  const majorityWrongSlowGrace = wrong.length > 0 &&
    wrong.filter(a => a.speedBucket === 'SLOW' || a.speedBucket === 'GRACE').length / wrong.length > 0.5;

  let verdict;
  if (posterior >= 0.75 && binomialRejectsLuck)         verdict = 'MASTERY';
  else if (posterior <= 0.25 && majorityWrongSlowGrace) verdict = 'KNOWLEDGE_GAP';
  else                                                   verdict = 'DEVELOPING';

  return {
    verdict,
    nAttempts: n,
    posterior: +posterior.toFixed(4),
    llr_total: +llr_total.toFixed(4),
    pChance,
    rgbCount,
  };
}
