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
 *   Course.progression         → teacher state (persisted)
 *     .levelTaught             → explicit teacher declaration (controls student unlock)
 *     .completedConceptOrders  → concept-level analytics only
 *   student unlock status      → DERIVED by these helpers (never stored)
 *
 * Key invariant:
 *   completedConceptOrders does NOT control student unlock.
 *   Only levelTaught controls student unlock.
 *   Concept completion and level teaching are independent.
 */

/**
 * Find the progression entry for a specific level.
 * @param {Array} progression - Course.progression array
 * @param {number} levelOrder
 * @returns {{ levelOrder: number, levelTaught: boolean, completedConceptOrders: number[] } | undefined}
 */
function getProgressionEntry(progression, levelOrder) {
  return (progression ?? []).find((p) => p.levelOrder === levelOrder);
}

/**
 * Returns the teacher-facing status of a curriculum level.
 * Derived from concept completions — used for concept-level analytics only.
 * Does NOT control student unlock.
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
 * Returns whether a level's levelTaught flag is set.
 * This is the teacher's explicit declaration — independent of concept completion.
 *
 * @param {Array}  progression - Course.progression array
 * @param {number} levelOrder
 * @returns {boolean}
 */
export function isLevelExplicitlyTaught(progression, levelOrder) {
  const entry = getProgressionEntry(progression, levelOrder);
  // Mongoose default is false; old docs without the field coerce to false.
  return entry?.levelTaught === true;
}

/**
 * Returns whether a given level is unlocked for STUDENT access.
 *
 * Unlock rule:
 *   A level is unlocked iff that level's OWN levelTaught === true.
 *
 *   Level 1 unlocked ↔ Level 1.levelTaught === true
 *   Level 2 unlocked ↔ Level 2.levelTaught === true
 *   Level N unlocked ↔ Level N.levelTaught === true
 *
 * The teacher-side sequential enforcement (canMarkLevelTaught) still prevents
 * marking Level N taught before Level N-1 is taught. But student access is
 * gated on each level's own explicit flag, not the prerequisite's flag.
 *
 * IMPORTANT: Concept completion does NOT affect student unlock.
 *   Only the explicit levelTaught flag on THIS level matters.
 *
 * Derived state only — never stored anywhere.
 *
 * @param {Array}  levels      - Course.generatedStructure.levels (unused, kept for API compat)
 * @param {Array}  progression - Course.progression array
 * @param {number} levelOrder  - The level to check
 * @returns {boolean}
 */
export function isLevelUnlockedForStudents(levels, progression, levelOrder) {
  if (levelOrder <= 0) return false;
  // Each level gates on its OWN levelTaught flag.
  return isLevelExplicitlyTaught(progression, levelOrder);
}

/**
 * Returns whether teaching Level N would violate the sequential prerequisite constraint.
 * Level N can only be marked taught if Level N-1 is already taught (or N === 1 with no prereq).
 *
 * @param {Array}  levels      - Course.generatedStructure.levels
 * @param {Array}  progression - Course.progression array
 * @param {number} levelOrder  - The level the teacher wants to mark taught
 * @returns {boolean}          - true if it is safe to mark this level taught
 */
export function canMarkLevelTaught(levels, progression, levelOrder) {
  if (levelOrder === 1) return true; // Level 1 has no prerequisite

  // Level N requires Level N-1 to be taught first
  const prerequisiteOrder = levelOrder - 1;
  const prerequisiteLevel = (levels ?? []).find((l) => l.order === prerequisiteOrder);
  if (!prerequisiteLevel) return false; // prerequisite level doesn't exist in curriculum

  return isLevelExplicitlyTaught(progression, prerequisiteOrder);
}

/**
 * Given levels and progression, builds a complete status map.
 *
 * @param {Array} levels      - Course.generatedStructure.levels
 * @param {Array} progression - Course.progression
 * @returns {Record<number, {
 *   teacherStatus: 'not_started'|'in_progress'|'taught',
 *   levelTaught: boolean,
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
      levelTaught: entry?.levelTaught === true,
      studentUnlocked: isLevelUnlockedForStudents(levels, progression, level.order),
      completedConceptOrders: entry?.completedConceptOrders ?? [],
    };
  }
  return result;
}
