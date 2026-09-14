/**
 * POST /api/student/concept-mastery/grade
 *
 * Called by the quiz-submit route after saving a QuizAttempt.
 * Grades the attempt through the Bayesian engine and updates ConceptMastery.
 *
 * Body: {
 *   quizAttemptId: string,
 *   courseId:      string,
 *   answers: [{
 *     concept:       string,
 *     difficulty:    "easy"|"medium"|"hard",
 *     isCorrect:     boolean,
 *     responseTimeMs: number,
 *   }]
 * }
 *
 * Response: { conceptVerdicts: { [concept]: { verdict, posterior, nAttempts } } }
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { gradeAndPersist } from '@/features/concept-mastery/service';

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { quizAttemptId, courseId, answers } = body ?? {};

  if (
    typeof quizAttemptId !== 'string' || !quizAttemptId ||
    typeof courseId !== 'string'      || !courseId ||
    !Array.isArray(answers)           || answers.length === 0
  ) {
    return NextResponse.json({ error: 'quizAttemptId, courseId, and answers are required' }, { status: 400 });
  }

  const VALID_TIERS = new Set(['easy', 'medium', 'hard']);
  for (const a of answers) {
    if (
      typeof a.concept !== 'string'       || !a.concept ||
      !VALID_TIERS.has(a.difficulty)      ||
      typeof a.isCorrect !== 'boolean'    ||
      typeof a.responseTimeMs !== 'number'
    ) {
      return NextResponse.json({ error: 'Each answer must have concept, difficulty, isCorrect, responseTimeMs' }, { status: 400 });
    }
  }

  try {
    const result = await gradeAndPersist(session.userId, courseId, quizAttemptId, answers);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('[concept-mastery/grade] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
