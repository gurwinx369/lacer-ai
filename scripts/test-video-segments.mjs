/**
 * scripts/test-video-segments.mjs
 *
 * Validates the video segment mapping logic (manual corrections/saving).
 * We don't have AI timestamp logic anymore, so we only test the manual flow
 * logic as it would affect the Course document array.
 */

import assert from 'node:assert/strict';

// Helper simulating what POST /api/teacher/course/concept/video-segment does
function saveVideoSegment(course, levelOrder, conceptOrder, startSeconds, endSeconds) {
  // Simulates the array filter and push
  const chunks = course.videoChunks || [];
  const newChunks = chunks.filter(c => c.levelOrder !== levelOrder || c.conceptOrder !== conceptOrder);
  newChunks.push({
    levelOrder,
    conceptOrder,
    startSeconds,
    endSeconds
  });
  course.videoChunks = newChunks;
  return course;
}

{
  // 1. Unmapped concept → safe (no crash, absent segment)
  const course = { videoChunks: [] };
  const chunk = course.videoChunks.find(c => c.levelOrder === 1 && c.conceptOrder === 1);
  assert.equal(chunk, undefined, 'Unmapped concept has no segment');
}

{
  // 2. Manual segment save persists correctly
  let course = { videoChunks: [] };
  course = saveVideoSegment(course, 1, 1, 10, 50);
  assert.equal(course.videoChunks.length, 1);
  assert.equal(course.videoChunks[0].startSeconds, 10);
  assert.equal(course.videoChunks[0].endSeconds, 50);
}

{
  // 3. Manual edit preserves correct level/concept identity (replaces old)
  let course = { 
    videoChunks: [
      { levelOrder: 1, conceptOrder: 1, startSeconds: 10, endSeconds: 50 },
      { levelOrder: 1, conceptOrder: 2, startSeconds: 60, endSeconds: 100 }
    ] 
  };
  
  // Edit 1-1
  course = saveVideoSegment(course, 1, 1, 20, 55);
  assert.equal(course.videoChunks.length, 2);
  
  const chunk1 = course.videoChunks.find(c => c.conceptOrder === 1);
  assert.equal(chunk1.startSeconds, 20);
  assert.equal(chunk1.endSeconds, 55);
  
  const chunk2 = course.videoChunks.find(c => c.conceptOrder === 2);
  assert.equal(chunk2.startSeconds, 60);
}

console.log('\n✅  All video segment helper tests passed.\n');
