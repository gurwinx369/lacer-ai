/**
 * POST /api/student/quiz/submit
 *
 * Saves a QuizAttempt and fires Bayesian concept mastery grading.
 *
 * Body: {
 *   quizId:  string,
 *   answers: [{
 *     serialNumber:  number,
 *     selectedAnswer: number,   // 0-indexed
 *     responseTimeMs: number,
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
import { gradeAndPersist } from '@/features/concept-mastery/service';
import { verifyAndGetStudentLevel } from '@/lib/student-course';

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

  const { quizId, answers } = body ?? {};

  if (
    typeof quizId !== 'string' || !quizId ||
    !Array.isArray(answers) || answers.length === 0
  ) {
    return NextResponse.json({ error: 'quizId and answers are required' }, { status: 400 });
  }

  await connectDB();

  // Verify quiz exists
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Verify level is unlocked using canonical logic
  const { error: unlockError, status: unlockStatus, course: safeCourse } = await verifyAndGetStudentLevel(quiz.levelOrder);
  if (unlockError) {
    return NextResponse.json({ error: unlockError }, { status: unlockStatus });
  }

  // Verify the quiz belongs to the canonical course
  if (quiz.course.toString() !== safeCourse.id) {
     return NextResponse.json({ error: 'Quiz does not belong to the current course' }, { status: 400 });
  }

  // Build answer docs — resolve correctAnswer + concept from the canonical Quiz doc
  const questionMap = Object.fromEntries(quiz.questions.map(q => [q.serialNumber, q]));
  const answerDocs = [];
  const seenSerialNumbers = new Set();

  if (answers.length !== quiz.questions.length) {
    return NextResponse.json({ error: `Expected exactly ${quiz.questions.length} answers, received ${answers.length}` }, { status: 400 });
  }

  for (const a of answers) {
    if (seenSerialNumbers.has(a.serialNumber)) {
      return NextResponse.json({ error: `Duplicate serialNumber: ${a.serialNumber}` }, { status: 400 });
    }
    seenSerialNumbers.add(a.serialNumber);

    const q = questionMap[a.serialNumber];
    if (!q) {
      return NextResponse.json({ error: `Unknown serialNumber: ${a.serialNumber}` }, { status: 400 });
    }

    if (a.selectedAnswer !== null && (!Number.isInteger(a.selectedAnswer) || a.selectedAnswer < 0 || a.selectedAnswer > 2)) {
      return NextResponse.json({ error: `Invalid selectedAnswer for question ${a.serialNumber}` }, { status: 400 });
    }

    const isCorrect = a.selectedAnswer === q.correctAnswer;
    answerDocs.push({
      serialNumber:   q.serialNumber,
      concept:        q.concept,
      difficulty:     q.difficulty,
      selectedAnswer: a.selectedAnswer ?? null,
      correctAnswer:  q.correctAnswer,
      isCorrect,
      responseTimeMs: (typeof a.responseTimeMs === 'number' && Number.isFinite(a.responseTimeMs) && a.responseTimeMs >= 0) ? a.responseTimeMs : 0,
    });
  }

  const score = answerDocs.filter(a => a.isCorrect).length;

  // Save the QuizAttempt
  const attempt = await QuizAttempt.create({
    student:        session.userId,
    quiz:           quizId,
    levelOrder:     quiz.levelOrder,
    course:         safeCourse.id,
    answers:        answerDocs,
    score,
    totalQuestions: answerDocs.length,
  });

  // ── Fire Bayesian mastery grading (non-blocking on error — attempt is
  //    already saved, mastery can be retried or back-filled later)
  try {
    await gradeAndPersist(
      session.userId,
      safeCourse.id,
      attempt._id.toString(),
      answerDocs.map(a => ({
        concept:       a.concept,
        difficulty:    a.difficulty,
        isCorrect:     a.isCorrect,
        responseTimeMs: a.responseTimeMs,
      })),
    );
  } catch (masteryErr) {
    // ponytail: swallowed so a mastery write failure never blocks quiz save.
    // Add alerting/retry here when mastery tracking becomes critical-path.
    console.error('[quiz/submit] mastery grading failed (non-fatal):', masteryErr);
  }

  return NextResponse.json(
    { score, totalQuestions: answerDocs.length, attemptId: attempt._id },
    { status: 201 },
  );
}

