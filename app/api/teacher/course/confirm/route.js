import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';

const DSA_SLUG = 'dsa';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await connectDB();

    const course = await Course.findOne({ slug: DSA_SLUG, createdBy: session.userId });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (course.status !== 'ready') {
      return NextResponse.json(
        { error: 'Course must be in "ready" status before it can be confirmed.' },
        { status: 400 }
      );
    }

    course.confirmedAt = new Date();
    await course.save();

    return NextResponse.json({ course });
  } catch (err) {
    console.error('[POST /api/teacher/course/confirm]', err.message);
    return NextResponse.json({ error: 'Failed to confirm course' }, { status: 500 });
  }
}
