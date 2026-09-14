/**
 * scripts/test-progression.mjs
 *
 * Unit tests for lib/progression.js pure helpers.
 * No DB, no server — runs with: node scripts/test-progression.mjs
 *
 * Tests cover:
 *   1. getLevelTeacherStatus — not_started / in_progress / taught
 *   2. isLevelUnlockedForStudents — Level 1, Level N, unmet prerequisites
 *   3. buildProgressionMap — complete map correctness
 */

import assert from 'node:assert/strict';

// ── Import helpers ──────────────────────────────────────────────────────────
// We use a dynamic import so the file path can be resolved from the project root.
const { getLevelTeacherStatus, isLevelUnlockedForStudents, buildProgressionMap } =
  await import('../lib/progression.js');

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

const levels = [level1, level2];

// ── getLevelTeacherStatus ───────────────────────────────────────────────────

{
  // 1a: no progression entry → not_started
  const status = getLevelTeacherStatus(level1, []);
  assert.equal(status, 'not_started', '1a: empty progression → not_started');
}

{
  // 1b: partial concepts completed → in_progress
  const progression = [{ levelOrder: 1, completedConceptOrders: [1] }];
  const status = getLevelTeacherStatus(level1, progression);
  assert.equal(status, 'in_progress', '1b: 1 of 2 concepts → in_progress');
}

{
  // 1c: all concepts completed → taught
  const progression = [{ levelOrder: 1, completedConceptOrders: [1, 2] }];
  const status = getLevelTeacherStatus(level1, progression);
  assert.equal(status, 'taught', '1c: all concepts → taught');
}

{
  // 1d: completedConceptOrders has more entries than concepts (shouldn't happen,
  //     but helper should treat it as taught)
  const progression = [{ levelOrder: 1, completedConceptOrders: [1, 2, 3, 4] }];
  const status = getLevelTeacherStatus(level1, progression);
  assert.equal(status, 'taught', '1d: over-filled → taught');
}

{
  // 1e: level with no concepts → vacuously taught
  const emptyLevel = { order: 5, title: 'Empty', concepts: [] };
  const status = getLevelTeacherStatus(emptyLevel, []);
  assert.equal(status, 'taught', '1e: level with no concepts → taught');
}

// ── isLevelUnlockedForStudents ──────────────────────────────────────────────

{
  // 2a: Level 1 not yet taught → locked
  const unlocked = isLevelUnlockedForStudents(levels, [], 1);
  assert.equal(unlocked, false, '2a: Level 1 not taught → locked');
}

{
  // 2b: Level 1 fully taught → Level 1 unlocked for students
  const progression = [{ levelOrder: 1, completedConceptOrders: [1, 2] }];
  const unlocked = isLevelUnlockedForStudents(levels, progression, 1);
  assert.equal(unlocked, true, '2b: Level 1 taught → Level 1 unlocked');
}

{
  // 2c: Level 1 taught → Level 2 unlocked
  const progression = [{ levelOrder: 1, completedConceptOrders: [1, 2] }];
  const unlocked = isLevelUnlockedForStudents(levels, progression, 2);
  assert.equal(unlocked, true, '2c: Level 1 taught → Level 2 unlocked');
}

{
  // 2d: Level 1 NOT fully taught → Level 2 locked
  const progression = [{ levelOrder: 1, completedConceptOrders: [1] }];
  const unlocked = isLevelUnlockedForStudents(levels, progression, 2);
  assert.equal(unlocked, false, '2d: Level 1 in_progress → Level 2 locked');
}

{
  // 2e: levelOrder that doesn't exist in levels → false
  const unlocked = isLevelUnlockedForStudents(levels, [], 99);
  assert.equal(unlocked, false, '2e: non-existent level → locked');
}

{
  // 2f: levelOrder 0 → false
  const unlocked = isLevelUnlockedForStudents(levels, [], 0);
  assert.equal(unlocked, false, '2f: levelOrder 0 → locked');
}

// ── buildProgressionMap ─────────────────────────────────────────────────────

{
  // 3a: empty progression → both levels not_started, both locked
  const map = buildProgressionMap(levels, []);
  assert.equal(map[1].teacherStatus, 'not_started', '3a: Level 1 → not_started');
  assert.equal(map[1].studentUnlocked, false, '3a: Level 1 → locked');
  assert.equal(map[2].teacherStatus, 'not_started', '3a: Level 2 → not_started');
  assert.equal(map[2].studentUnlocked, false, '3a: Level 2 → locked');
}

{
  // 3b: Level 1 fully taught → Level 1 taught+unlocked, Level 2 not_started+unlocked
  const progression = [{ levelOrder: 1, completedConceptOrders: [1, 2] }];
  const map = buildProgressionMap(levels, progression);
  assert.equal(map[1].teacherStatus, 'taught', '3b: Level 1 → taught');
  assert.equal(map[1].studentUnlocked, true, '3b: Level 1 → unlocked');
  assert.equal(map[2].teacherStatus, 'not_started', '3b: Level 2 → not_started');
  assert.equal(map[2].studentUnlocked, true, '3b: Level 2 → unlocked (prereq met)');
}

{
  // 3c: idempotency — completedConceptOrders preserved in map
  const progression = [{ levelOrder: 1, completedConceptOrders: [1, 2] }];
  const map = buildProgressionMap(levels, progression);
  assert.deepEqual(map[1].completedConceptOrders, [1, 2], '3c: completedConceptOrders preserved');
  assert.deepEqual(map[2].completedConceptOrders, [], '3c: Level 2 empty array');
}

// ── Done ────────────────────────────────────────────────────────────────────

console.log('\n✅  All progression helper tests passed.\n');
