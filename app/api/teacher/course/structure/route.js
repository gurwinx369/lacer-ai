import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { mutateRoadmapStructure } from '@/lib/roadmap';

const DSA_SLUG = 'dsa';

export async function PATCH(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { action, levelOrder, conceptOrder, direction, title, description, learningObjectives } = body ?? {};

  if (!action) {
    return NextResponse.json({ error: 'Missing action.' }, { status: 400 });
  }

  try {
    await connectDB();
    const course = await Course.findOne({ slug: DSA_SLUG, createdBy: session.userId });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (course.status !== 'ready') {
      return NextResponse.json({ error: 'Course must be in "ready" status.' }, { status: 400 });
    }

    if (course.confirmedAt) {
      return NextResponse.json({ error: 'Cannot modify a confirmed roadmap.' }, { status: 403 });
    }

    const levels = course.generatedStructure?.levels ?? [];

    try {
      mutateRoadmapStructure(course, action, { levelOrder, conceptOrder, direction, title, description, learningObjectives });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Mark structure modified so Mongoose knows it changed (Mixed type)
    course.markModified('generatedStructure');
    
    await course.save();

    return NextResponse.json({ course });
  } catch (err) {
    console.error('[PATCH /api/teacher/course/structure]', err.message);
    return NextResponse.json({ error: 'Failed to update course structure.' }, { status: 500 });
  }
}
