/**
 * scripts/test-progression.mjs
 *
 * Unit tests for lib/progression.js pure helpers.
 * No DB, no server — runs with: node scripts/test-progression.mjs
 *
 * Invariants verified:
 *   1. getLevelTeacherStatus — concept analytics (independent of unlock)
 *   2. isLevelExplicitlyTaught — reads levelTaught flag
 *   3. isLevelUnlockedForStudents — each level gates on ITS OWN levelTaught
 *   4. canMarkLevelTaught — sequential teacher-side prerequisite
 *   5. buildProgressionMap — complete map correctness
 *   6. Backward compat — old data (completedConceptOrders only) stays locked
 */

import assert from 'node:assert/strict';

const {
  getLevelTeacherStatus,
  isLevelExplicitlyTaught,
  isLevelUnlockedForStudents,
  canMarkLevelTaught,
  buildProgressionMap
} = await import('../lib/progression.js');

// ── Fixtures ────────────────────────────────────────────────────────────────

const level1 = {
  order: 1,
  title: 'Arrays',
  concepts: [
    { order: 1, title: 'Intro to Arrays' },
    { order: 2, title: 'Array Operations' },
  ],
};

const level2 = {
  order: 2,
  title: 'Linked Lists',
  concepts: [
    { order: 1, title: 'Singly Linked List' },
    { order: 2, title: 'Doubly Linked List' },
    { order: 3, title: 'Traversal' },
  ],
};

const level3 = {
  order: 3,
  title: 'Stacks & Queues',
  concepts: [
    { order: 1, title: 'Stack' },
    { order: 2, title: 'Queue' },
  ],
};

const levels = [level1, level2, level3];

// ── 1. getLevelTeacherStatus ─────────────────────────────────────────────────

{
  // 1a: no progression entry → not_started
  assert.equal(getLevelTeacherStatus(level1, []), 'not_started', '1a: empty progression → not_started');
}
{
  // 1b: partial concepts completed → in_progress
  const prog = [{ levelOrder: 1, completedConceptOrders: [1] }];
  assert.equal(getLevelTeacherStatus(level1, prog), 'in_progress', '1b: 1/2 concepts → in_progress');
}
{
  // 1c: all concepts completed → taught
  const prog = [{ levelOrder: 1, completedConceptOrders: [1, 2] }];
  assert.equal(getLevelTeacherStatus(level1, prog), 'taught', '1c: all concepts → taught');
}

// ── 2. isLevelExplicitlyTaught ───────────────────────────────────────────────

{
  assert.equal(isLevelExplicitlyTaught([], 1), false, '2a: no entry → false');
  assert.equal(isLevelExplicitlyTaught([{ levelOrder: 1 }], 1), false, '2b: missing field → false');
  assert.equal(isLevelExplicitlyTaught([{ levelOrder: 1, levelTaught: false }], 1), false, '2c: explicit false → false');
  assert.equal(isLevelExplicitlyTaught([{ levelOrder: 1, levelTaught: true }], 1), true, '2d: explicit true → true');
}

// ── 3. isLevelUnlockedForStudents — each level gates on ITS OWN levelTaught ──

{
  // Scenario: nothing taught
  assert.equal(isLevelUnlockedForStudents(levels, [], 1), false, '3a: L1 not taught → locked');
  assert.equal(isLevelUnlockedForStudents(levels, [], 2), false, '3b: L2 not taught → locked');
  assert.equal(isLevelUnlockedForStudents(levels, [], 3), false, '3c: L3 not taught → locked');
}
{
  // Scenario: L1 levelTaught=true
  const prog = [{ levelOrder: 1, levelTaught: true }];
  assert.equal(isLevelUnlockedForStudents(levels, prog, 1), true,  '3d: L1 taught → L1 unlocked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 2), false, '3e: L1 taught, L2 NOT taught → L2 locked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 3), false, '3f: L3 NOT taught → L3 locked');
}
{
  // Scenario: L2 levelTaught=true (L1 may or may not be taught — student access independent)
  const prog = [
    { levelOrder: 1, levelTaught: true },
    { levelOrder: 2, levelTaught: true },
  ];
  assert.equal(isLevelUnlockedForStudents(levels, prog, 1), true,  '3g: L1 taught → L1 unlocked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 2), true,  '3h: L2 taught → L2 unlocked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 3), false, '3i: L3 NOT taught → L3 locked');
}
{
  // Scenario: all levels taught
  const prog = [
    { levelOrder: 1, levelTaught: true },
    { levelOrder: 2, levelTaught: true },
    { levelOrder: 3, levelTaught: true },
  ];
  assert.equal(isLevelUnlockedForStudents(levels, prog, 1), true, '3j: L1 unlocked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 2), true, '3k: L2 unlocked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 3), true, '3l: L3 unlocked');
}
{
  // CRITICAL: Old progression data (completedConceptOrders only, no levelTaught) → all locked
  const prog = [{ levelOrder: 1, completedConceptOrders: [1, 2] }];
  assert.equal(isLevelUnlockedForStudents(levels, prog, 1), false,
    '3m (CRITICAL): concepts complete but levelTaught absent → L1 locked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 2), false,
    '3n (CRITICAL): concepts complete but levelTaught absent → L2 locked');
}
{
  // Concept toggles never affect unlock
  const prog = [{ levelOrder: 1, levelTaught: false, completedConceptOrders: [1, 2] }];
  assert.equal(isLevelUnlockedForStudents(levels, prog, 1), false,
    '3o: levelTaught=false even with all concepts → locked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 2), false,
    '3p: L2 — concepts on L1 complete but L2 levelTaught absent → locked');
}
{
  // Unmark L1: L1 becomes locked; L2 was independently taught so remains independently unlocked
  const prog = [
    { levelOrder: 1, levelTaught: false },
    { levelOrder: 2, levelTaught: true },
  ];
  assert.equal(isLevelUnlockedForStudents(levels, prog, 1), false,
    '3q: L1 unmarked → L1 locked');
  assert.equal(isLevelUnlockedForStudents(levels, prog, 2), true,
    '3r: L2 independently taught → L2 still unlocked');
}

// ── 4. canMarkLevelTaught — teacher-side sequential enforcement ──────────────

{
  assert.equal(canMarkLevelTaught(levels, [], 1), true,
    '4a: Level 1 can always be marked taught');
  assert.equal(canMarkLevelTaught(levels, [], 2), false,
    '4b: Level 2 needs Level 1 taught first');
  const prog = [{ levelOrder: 1, levelTaught: true }];
  assert.equal(canMarkLevelTaught(levels, prog, 2), true,
    '4c: Level 2 can be marked if Level 1 taught');
  assert.equal(canMarkLevelTaught(levels, prog, 3), false,
    '4d: Level 3 needs Level 2 taught first');
  const prog2 = [
    { levelOrder: 1, levelTaught: true },
    { levelOrder: 2, levelTaught: true },
  ];
  assert.equal(canMarkLevelTaught(levels, prog2, 3), true,
    '4e: Level 3 can be marked if Level 2 taught');
}

// ── 5. buildProgressionMap ───────────────────────────────────────────────────

{
  // 5a: empty progression — all locked
  const map = buildProgressionMap(levels, []);
  assert.equal(map[1].teacherStatus, 'not_started', '5a: L1 teacherStatus');
  assert.equal(map[1].levelTaught, false, '5a: L1 levelTaught');
  assert.equal(map[1].studentUnlocked, false, '5a: L1 studentUnlocked');
  assert.equal(map[2].studentUnlocked, false, '5a: L2 studentUnlocked');
  assert.equal(map[3].studentUnlocked, false, '5a: L3 studentUnlocked');
}
{
  // 5b: Level 1 taught → only L1 unlocked, L2 and L3 remain locked
  const prog = [{ levelOrder: 1, levelTaught: true, completedConceptOrders: [1, 2] }];
  const map = buildProgressionMap(levels, prog);
  assert.equal(map[1].teacherStatus, 'taught', '5b: L1 teacherStatus');
  assert.equal(map[1].levelTaught, true, '5b: L1 levelTaught');
  assert.equal(map[1].studentUnlocked, true, '5b: L1 studentUnlocked');
  assert.equal(map[2].studentUnlocked, false, '5b: L2 studentUnlocked — still locked');
  assert.equal(map[3].studentUnlocked, false, '5b: L3 studentUnlocked — still locked');
}

// ── Done ────────────────────────────────────────────────────────────────────

console.log('\n✅  All progression helper tests passed.\n');
