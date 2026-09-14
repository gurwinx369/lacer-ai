/**
 * engine.test.js — self-check for the Bayesian engine.
 * Run with: node features/concept-mastery/engine.test.js
 * No frameworks, no fixtures. Fails loudly if math breaks.
 */

import { computeEiIncremental, gradeAttempt, classifyConcept } from './engine.js';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── E_i shrinkage ─────────────────────────────────────────────────────────

console.log('\nLayer 0 — E_i shrinkage');

// Cold start: returns anchor
const cold = computeEiIncremental(null, 0, 'medium');
assert('cold start returns medium anchor (20000)', cold.ei === 20000 && cold.n === 0);

// First observation: blended toward anchor
const first = computeEiIncremental(null, 0, 'medium', 10000);
// (20000 * 10 + 10000) / 11 = 19090.9...
assert('first observation shrinks toward anchor', first.ei > 19000 && first.ei < 20000);
assert('sample count increments', first.n === 1);

// No observation: just resolves
const resolved = computeEiIncremental(15000, 5, 'easy');
assert('no observation: returns stored value unchanged', resolved.ei === 15000 && resolved.n === 5);

// ── Per-attempt grading ───────────────────────────────────────────────────

console.log('\nLayer 1 — gradeAttempt');

// Fast correct → positive LLR
const fastCorrect = gradeAttempt(3000, 20000, true);
assert('fast+correct → FAST bucket',       fastCorrect.speedBucket === 'FAST');
assert('fast+correct → positive LLR',      fastCorrect.llrContribution > 0);
assert('fast+correct → no rgbFlag at 3000ms on 20000ms E_i', !fastCorrect.rgbFlag);

// RGB flag: t_i < max(3000, 0.10 * E_i) → 0.10*20000 = 2000, max = 3000
const rgbAttempt = gradeAttempt(1000, 20000, true);
assert('t=1000 < 3000 → rgbFlag=true',     rgbAttempt.rgbFlag === true);

// Unattempted
const unatt = gradeAttempt(75000, 20000, false);
assert('t>70000 → UNATTEMPTED',            unatt.speedBucket === 'UNATTEMPTED');
assert('UNATTEMPTED → null llrContribution', unatt.llrContribution === null);

// ── Concept classification ────────────────────────────────────────────────

console.log('\nLayer 2 — classifyConcept');

// < 3 attempts → INSUFFICIENT_DATA
const few = [
  gradeAttempt(5000, 20000, true),
  gradeAttempt(6000, 20000, true),
];
assert('2 attempts → INSUFFICIENT_DATA', classifyConcept(few).verdict === 'INSUFFICIENT_DATA');

// 5 fast+correct → MASTERY
const masteryAttempts = Array.from({ length: 5 }, () => gradeAttempt(4000, 20000, true));
const masteryResult = classifyConcept(masteryAttempts);
assert('5 fast+correct → MASTERY',         masteryResult.verdict === 'MASTERY');
assert('MASTERY posterior >= 0.75',         masteryResult.posterior >= 0.75);

// 5 slow+wrong → KNOWLEDGE_GAP
const gapAttempts = Array.from({ length: 5 }, () => gradeAttempt(40000, 20000, false));
const gapResult = classifyConcept(gapAttempts);
assert('5 slow+wrong → KNOWLEDGE_GAP',     gapResult.verdict === 'KNOWLEDGE_GAP');
assert('KNOWLEDGE_GAP posterior <= 0.25',  gapResult.posterior <= 0.25);

// ── Summary ───────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
