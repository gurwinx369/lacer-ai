import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Course from '@/models/Course';
import Quiz from '@/models/Quiz';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { levelOrder: levelOrderParam } = await params;
  const levelOrder = parseInt(levelOrderParam, 10);

  if (isNaN(levelOrder) || levelOrder < 1) {
    return NextResponse.json({ error: 'Invalid levelOrder' }, { status: 400 });
  }

  await connectDB();

  const course = await Course.findOne({
    slug: 'dsa',
    createdBy: session.userId,
  }).select('_id generatedStructure').lean();

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  const levelExists = course.generatedStructure?.levels?.some(l => l.order === levelOrder);
  if (!levelExists) {
    return NextResponse.json({ error: 'Level not found in curriculum' }, { status: 404 });
  }

  const count = await Quiz.countDocuments({
    course: course._id,
    levelOrder,
  });

  return NextResponse.json({ count }, { status: 200 });
}
