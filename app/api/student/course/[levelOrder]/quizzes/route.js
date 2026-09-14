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

  const { levelOrder: levelOrderParam } = await params;
  const levelOrder = parseInt(levelOrderParam, 10);

  if (isNaN(levelOrder) || levelOrder < 1) {
    return NextResponse.json({ error: 'Invalid levelOrder' }, { status: 400 });
  }

  await connectDB();

  // Enforces student session -> canonical DSA course -> level exists -> level unlocked
  const { error, status, course } = await verifyAndGetStudentLevel(levelOrder);
  if (error) {
    return NextResponse.json({ error }, { status: status || 400 });
  }

  // Load quizzes for this level, ensuring they belong to the canonical course
  const quizzes = await Quiz.find({ course: course.id, levelOrder })
    .select('serialNumber title levelOrder')
    .sort({ serialNumber: 1 })
    .lean();

  return NextResponse.json({ quizzes }, { status: 200 });
}
