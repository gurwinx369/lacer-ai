/**
 * lib/progression.js
 *
 * Pure helper functions for deriving teacher completion state and student
 * unlock eligibility from Course.generatedStructure + Course.progression.
 *
 * No DB access. No side effects. Fully testable in isolation.
 *
 * Architecture:
 *   Course.generatedStructure  → canonical curriculum (source of truth)
 *   Course.progression         → teacher completion state (persisted)
 *   student unlock status      → DERIVED by these helpers (never stored)
 */

/**
 * Find the progression entry for a specific level.
 * @param {Array} progression - Course.progression array
 * @param {number} levelOrder
 * @returns {{ levelOrder: number, completedConceptOrders: number[] } | undefined}
 */
function getProgressionEntry(progression, levelOrder) {
  return (progression ?? []).find((p) => p.levelOrder === levelOrder);
}

/**
 * Returns the teacher-facing status of a curriculum level.
 *
 * @param {{ order: number, concepts: Array }} level   - from generatedStructure.levels
 * @param {Array} progression                          - Course.progression array
 * @returns {'not_started' | 'in_progress' | 'taught'}
 *
 * Rules:
 *   not_started  — no concepts completed for this level
 *   in_progress  — at least 1 concept completed, but not all
 *   taught       — ALL concepts in the level are completed
 */
export function getLevelTeacherStatus(level, progression) {
  const totalConcepts = level.concepts?.length ?? 0;
  if (totalConcepts === 0) return 'taught'; // edge case: empty level is vacuously complete

  const entry = getProgressionEntry(progression, level.order);
  const completed = entry?.completedConceptOrders?.length ?? 0;

  if (completed === 0) return 'not_started';
  if (completed >= totalConcepts) return 'taught';
  return 'in_progress';
}

/**
 * Returns whether a given level is unlocked for STUDENT access.
 *
 * Unlock rules:
 *   Level 1 is unlocked only after Level 1 is fully taught.
 *     (Teachers teach; then Level 1 opens for students.)
 *   Level N (N > 1) is unlocked only after Level N-1 is fully taught.
 *
 * Derived state only — never stored anywhere.
 *
 * @param {Array}  levels      - Course.generatedStructure.levels (sorted by order)
 * @param {Array}  progression - Course.progression array
 * @param {number} levelOrder  - The level to check
 * @returns {boolean}
 */
export function isLevelUnlockedForStudents(levels, progression, levelOrder) {
  if (levelOrder <= 0) return false;

  // The level that must be 'taught' before levelOrder unlocks:
  // For levelOrder=1 → itself must be taught (Level 1 unlocks after it is taught)
  // For levelOrder=N → level N-1 must be taught
  const prerequisiteOrder = levelOrder === 1 ? 1 : levelOrder - 1;
  const prerequisiteLevel = (levels ?? []).find((l) => l.order === prerequisiteOrder);

  if (!prerequisiteLevel) return false;
  return getLevelTeacherStatus(prerequisiteLevel, progression) === 'taught';
}

/**
 * Given levels and progression, builds a complete status map.
 *
 * @param {Array} levels      - Course.generatedStructure.levels
 * @param {Array} progression - Course.progression
 * @returns {Record<number, {
 *   teacherStatus: 'not_started'|'in_progress'|'taught',
 *   studentUnlocked: boolean,
 *   completedConceptOrders: number[],
 * }>}
 * Keyed by levelOrder.
 */
export function buildProgressionMap(levels, progression) {
  const result = {};
  for (const level of levels ?? []) {
    const entry = getProgressionEntry(progression, level.order);
    result[level.order] = {
      teacherStatus: getLevelTeacherStatus(level, progression),
      studentUnlocked: isLevelUnlockedForStudents(levels, progression, level.order),
      completedConceptOrders: entry?.completedConceptOrders ?? [],
    };
  }
  return result;
}
