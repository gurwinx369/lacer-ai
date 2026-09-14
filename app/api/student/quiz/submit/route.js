/**
 * POST /api/student/quiz/submit
 *
 * Saves a QuizAttempt and fires Bayesian concept mastery grading.
 *
 * Body: {
 *   quizId:  string,
 *   courseId: string,
 *   answers: [{
 *     serialNumber:  number,
 *     concept:       string,
 *     difficulty:    "easy"|"medium"|"hard",
 *     selectedAnswer: number,   // 0-indexed
 *     correctAnswer:  number,   // 0-indexed (from Quiz doc)
 *     responseTimeMs: number,
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
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

  const { quizId, courseId, answers } = body ?? {};

  if (
    typeof quizId !== 'string'    || !quizId ||
    typeof courseId !== 'string'  || !courseId ||
    !Array.isArray(answers)       || answers.length === 0
  ) {
    return NextResponse.json({ error: 'quizId, courseId, and answers are required' }, { status: 400 });
  }

  await connectDB();

  // Verify quiz belongs to this course
  const quiz = await Quiz.findOne({ _id: quizId, course: courseId }).lean();
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Build answer docs — resolve correctAnswer + concept from the canonical Quiz doc
  const questionMap = Object.fromEntries(quiz.questions.map(q => [q.serialNumber, q]));
  const answerDocs = [];

  for (const a of answers) {
    const q = questionMap[a.serialNumber];
    if (!q) return NextResponse.json({ error: `Unknown serialNumber: ${a.serialNumber}` }, { status: 400 });
    const isCorrect = a.selectedAnswer === q.correctAnswer;
    answerDocs.push({
      serialNumber:   q.serialNumber,
      concept:        q.concept,
      difficulty:     q.difficulty,
      selectedAnswer: a.selectedAnswer ?? null,
      correctAnswer:  q.correctAnswer,
      isCorrect,
      responseTimeMs: typeof a.responseTimeMs === 'number' ? a.responseTimeMs : 0,
    });
  }

  const score = answerDocs.filter(a => a.isCorrect).length;

  // Save the QuizAttempt
  const attempt = await QuizAttempt.create({
    student:        session.userId,
    quiz:           quizId,
    levelOrder:     quiz.levelOrder,
    course:         courseId,
    answers:        answerDocs,
    score,
    totalQuestions: answerDocs.length,
  });

  // ── Fire Bayesian mastery grading (non-blocking on error — attempt is
  //    already saved, mastery can be retried or back-filled later)
  try {
    await gradeAndPersist(
      session.userId,
      courseId,
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

