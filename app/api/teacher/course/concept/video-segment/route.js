import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';

const DSA_SLUG = 'dsa';

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const levelOrder = parseInt(body.levelOrder, 10);
    const conceptOrder = parseInt(body.conceptOrder, 10);
    const startSeconds = parseInt(body.startSeconds, 10);
    const endSeconds = parseInt(body.endSeconds, 10);

    // Validation
    if (isNaN(levelOrder) || levelOrder < 1 || isNaN(conceptOrder) || conceptOrder < 1) {
      return NextResponse.json({ error: 'Invalid levelOrder or conceptOrder' }, { status: 400 });
    }
    if (isNaN(startSeconds) || startSeconds < 0) {
      return NextResponse.json({ error: 'startSeconds must be a positive integer' }, { status: 400 });
    }
    if (isNaN(endSeconds) || endSeconds <= startSeconds) {
      return NextResponse.json({ error: 'endSeconds must be an integer greater than startSeconds' }, { status: 400 });
    }

    await connectDB();

    const course = await Course.findOne({ slug: DSA_SLUG, createdBy: session.userId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (course.status !== 'ready' || !course.confirmedAt) {
      return NextResponse.json({ error: 'Course must be confirmed before adding video segments' }, { status: 400 });
    }

    // Verify concept exists in canonical structure
    const level = course.generatedStructure?.levels?.find(l => l.order === levelOrder);
    if (!level) {
      return NextResponse.json({ error: 'Level not found in course structure' }, { status: 400 });
    }
    const concept = level.concepts?.find(c => c.order === conceptOrder);
    if (!concept) {
      return NextResponse.json({ error: 'Concept not found in course structure' }, { status: 400 });
    }

    // Explicit read/update/save MVP strategy.
    // Removes any existing duplicates for this levelOrder/conceptOrder and appends the new one.
    // Concurrency limitation: concurrent requests for the SAME course could theoretically overwrite array state
    // if executed at the exact same millisecond, but safe for single-teacher MVP flows.
    const chunks = Array.isArray(course.videoChunks) ? course.videoChunks : [];
    
    // Filter out existing mapping(s) for this concept
    const newChunks = chunks.filter(c => c.levelOrder !== levelOrder || c.conceptOrder !== conceptOrder);
    
    // Add the new valid mapping
    newChunks.push({
      levelOrder,
      conceptOrder,
      startSeconds,
      endSeconds
    });

    course.videoChunks = newChunks;
    await course.save();

    return NextResponse.json({ success: true, videoChunks: course.videoChunks });
  } catch (err) {
    console.error('[POST /api/teacher/course/concept/video-segment]', err.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
