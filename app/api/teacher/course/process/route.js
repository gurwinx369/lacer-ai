import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { generateCourseStructure } from '@/lib/gemini';

const DSA_SLUG = 'dsa';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await connectDB();

    const course = await Course.findOne({ slug: DSA_SLUG, createdBy: session.userId });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found. Please complete course setup first.' },
        { status: 404 }
      );
    }

    if (!course.syllabus || course.syllabus.trim().length < 50) {
      return NextResponse.json(
        { error: 'Syllabus is missing or too short. Please update course setup.' },
        { status: 400 }
      );
    }

    // Prevent double-processing — if already running, return current state.
    if (course.status === 'processing') {
      return NextResponse.json({ course });
    }

    // Mark as processing before calling Gemini.
    course.status = 'processing';
    course.processingError = null;
    course.generatedStructure = null;
    await course.save();

    let structure;
    try {
      structure = await generateCourseStructure(
        course.syllabus,
        course.youtubeUrl,
        course.title
      );
    } catch (geminiErr) {
      // Gemini failed — record the error, do not save invalid data.
      course.status = 'failed';
      course.processingError = geminiErr.message || 'Processing failed. Please try again.';
      await course.save();

      return NextResponse.json(
        { error: course.processingError, course },
        { status: 422 }
      );
    }

    // Structure validated inside generateCourseStructure — safe to persist.
    course.status = 'ready';
    course.generatedStructure = structure;
    course.processingError = null;
    await course.save();

    return NextResponse.json({ course });
  } catch (err) {
    console.error('[POST /api/teacher/course/process]', err.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
