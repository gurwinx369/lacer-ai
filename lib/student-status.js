/**
 * lib/student-status.js
 *
 * Provides a pure, deterministic status classification for a student
 * across both Feature 5 and Feature 6.
 *
 * @param {Object} params
 * @param {boolean} params.hasActivity - Whether the student has ever taken a quiz.
 * @param {number} params.attentionConceptCount - Number of canonical concepts with KNOWLEDGE_GAP or DISENGAGED_GUESSING.
 * @returns {string} One of: 'NO_ACTIVITY', 'AT_RISK', 'LAGGING', 'GOOD'
 */
export function classifyStudentStatus({ hasActivity, attentionConceptCount }) {
  if (!hasActivity) {
    return 'NO_ACTIVITY';
  }

  if (attentionConceptCount >= 2) {
    return 'AT_RISK';
  }

  if (attentionConceptCount === 1) {
    return 'LAGGING';
  }

  return 'GOOD';
}
