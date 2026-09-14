import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Quiz from '@/models/Quiz';
import { verifyAndGetStudentLevel } from '@/lib/student-course';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { levelOrder: levelOrderParam, quizId } = await params;
  const levelOrder = parseInt(levelOrderParam, 10);

  if (isNaN(levelOrder) || levelOrder < 1) {
    return NextResponse.json({ error: 'Invalid levelOrder' }, { status: 400 });
  }

  if (typeof quizId !== 'string' || !quizId) {
    return NextResponse.json({ error: 'quizId is required' }, { status: 400 });
  }

  await connectDB();

  // Verify progression unlock state via canonical logic
  const { error, status, course } = await verifyAndGetStudentLevel(levelOrder);
  if (error) {
    return NextResponse.json({ error }, { status: status || 400 });
  }

  // Load the specific quiz, strictly tied to the unlocked canonical level
  const quiz = await Quiz.findOne({ _id: quizId, course: course.id, levelOrder }).lean();
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found in this level' }, { status: 404 });
  }

  // Explicit DTO: Strip correctAnswer completely from the response payload
  const safeQuestions = (quiz.questions ?? []).map((q) => ({
    serialNumber: q.serialNumber,
    question: q.question,
    options: q.options,
    // explicitly NOT returning correctAnswer, concept, or difficulty if they aren't needed for UX.
    // concept is sometimes useful if we want to show it, but for a quiz taking UX, we just need question & options.
  }));

  const safeQuiz = {
    id: quiz._id.toString(),
    title: quiz.title,
    serialNumber: quiz.serialNumber,
    levelOrder: quiz.levelOrder,
    questions: safeQuestions,
  };

  return NextResponse.json({ quiz: safeQuiz }, { status: 200 });
}
