import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Assignment from '@/models/Assignment';
import AssignmentAttempt from '@/models/AssignmentAttempt';
import { verifyAndGetStudentLevel } from '@/lib/student-course';
import { gradeAndPersist } from '@/features/concept-mastery/service';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const levelOrder = parseInt(resolvedParams.levelOrder, 10);
  if (isNaN(levelOrder) || levelOrder < 1) {
    return NextResponse.json({ error: 'Invalid level order' }, { status: 400 });
  }

  await connectDB();

  // Verify level is unlocked
  const { error: unlockError, status: unlockStatus, course: safeCourse } = await verifyAndGetStudentLevel(levelOrder);
  if (unlockError) {
    return NextResponse.json({ error: unlockError }, { status: unlockStatus });
  }

  // Find assignment
  const assignment = await Assignment.findOne({ course: safeCourse.id, levelOrder }).lean();
  
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Check availability
  const now = new Date();
  if (new Date(assignment.availableFrom) > now) {
    return NextResponse.json({ error: 'Assignment is not available yet', status: 'LOCKED' }, { status: 403 });
  }

  // Check if already attempted
  const existingAttempt = await AssignmentAttempt.findOne({
    student: session.userId,
    assignment: assignment._id,
  }).lean();

  if (existingAttempt) {
    return NextResponse.json({ 
      error: 'Assignment already completed', 
      status: 'COMPLETED',
      attemptId: existingAttempt._id
    }, { status: 409 });
  }

  // Format safe DTO
  const safeAssignment = {
    _id: assignment._id,
    title: assignment.title,
    description: assignment.description,
    availableFrom: assignment.availableFrom,
    dueDate: assignment.dueDate,
    questions: assignment.questions.map(q => ({
      serialNumber: q.serialNumber,
      question: q.question,
      options: q.options,
    })).sort((a, b) => a.serialNumber - b.serialNumber),
  };

  return NextResponse.json({ assignment: safeAssignment });
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const levelOrder = parseInt(resolvedParams.levelOrder, 10);
  if (isNaN(levelOrder) || levelOrder < 1) {
    return NextResponse.json({ error: 'Invalid level order' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { answers } = body ?? {};
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'answers array is required' }, { status: 400 });
  }

  await connectDB();

  // Verify level is unlocked
  const { error: unlockError, status: unlockStatus, course: safeCourse } = await verifyAndGetStudentLevel(levelOrder);
  if (unlockError) {
    return NextResponse.json({ error: unlockError }, { status: unlockStatus });
  }

  // Find assignment
  const assignment = await Assignment.findOne({ course: safeCourse.id, levelOrder }).lean();
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Check availability
  if (new Date(assignment.availableFrom) > new Date()) {
    return NextResponse.json({ error: 'Assignment is not available yet' }, { status: 403 });
  }

  // Check existing attempt (One-Attempt Policy)
  const existingAttempt = await AssignmentAttempt.findOne({
    student: session.userId,
    assignment: assignment._id,
  }).lean();

  if (existingAttempt) {
    return NextResponse.json({ error: 'You have already submitted this assignment.' }, { status: 409 });
  }

  const questionMap = Object.fromEntries(assignment.questions.map(q => [q.serialNumber, q]));
  const answerDocs = [];
  const seenSerialNumbers = new Set();

  if (answers.length !== assignment.questions.length) {
    return NextResponse.json({ error: `Expected exactly ${assignment.questions.length} answers, received ${answers.length}` }, { status: 400 });
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
    });
  }

  const score = answerDocs.filter(a => a.isCorrect).length;

  const attempt = await AssignmentAttempt.create({
    student:        session.userId,
    assignment:     assignment._id,
    levelOrder:     assignment.levelOrder,
    course:         safeCourse.id,
    answers:        answerDocs,
    score,
    totalQuestions: answerDocs.length,
  });

  try {
    await gradeAndPersist(
      session.userId,
      safeCourse.id,
      attempt._id.toString(),
      answerDocs.map(a => ({
        concept:       a.concept,
        difficulty:    a.difficulty,
        isCorrect:     a.isCorrect,
        responseTimeMs: null, // Critical: explicitly null for assignments
      })),
    );
  } catch (masteryErr) {
    console.error('[assignment/submit] mastery grading failed (non-fatal):', masteryErr);
  }

  return NextResponse.json(
    { score, totalQuestions: answerDocs.length, attemptId: attempt._id },
    { status: 201 },
  );
}
