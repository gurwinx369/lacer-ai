import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course, { isValidYoutubeUrl } from '@/models/Course';

const DSA_SLUG = 'dsa';
const DSA_TITLE = 'Data Structures & Algorithms';

// --- Authorization helper (page vs API boundary) ---
async function authorizeTeacher() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401 };
  if (session.role !== 'teacher') return { error: 'Forbidden', status: 403 };
  return { session };
}

// GET /api/teacher/course — returns teacher's DSA course or { course: null }
export async function GET() {
  const auth = await authorizeTeacher();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const course = await Course.findOne({
      slug: DSA_SLUG,
      createdBy: auth.session.userId,
    }).lean();

    return NextResponse.json({ course: course ?? null });
  } catch (err) {
    console.error('[GET /api/teacher/course]', err.message);
    return NextResponse.json({ error: 'Failed to load course' }, { status: 500 });
  }
}

// POST /api/teacher/course — upsert DSA course with syllabus + YouTube URL
export async function POST(request) {
  const auth = await authorizeTeacher();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { syllabus, youtubeUrl } = body;

  // Validate inputs server-side.
  if (!syllabus || typeof syllabus !== 'string' || syllabus.trim().length < 50) {
    return NextResponse.json(
      { error: 'Syllabus must be at least 50 characters.' },
      { status: 400 }
    );
  }
  if (!youtubeUrl || !isValidYoutubeUrl(youtubeUrl)) {
    return NextResponse.json(
      { error: 'Please provide a valid YouTube URL (youtube.com or youtu.be).' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Upsert — one DSA course per teacher. Prevents duplicates.
    const course = await Course.findOneAndUpdate(
      { slug: DSA_SLUG, createdBy: auth.session.userId },
      {
        $set: {
          title: DSA_TITLE,
          slug: DSA_SLUG,
          syllabus: syllabus.trim(),
          youtubeUrl: youtubeUrl.trim(),
          // Reset to draft if teacher is re-submitting setup.
          status: 'draft',
          processingError: null,
        },
        $setOnInsert: {
          createdBy: auth.session.userId,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ course });
  } catch (err) {
    console.error('[POST /api/teacher/course]', err.message);
    return NextResponse.json({ error: 'Failed to save course' }, { status: 500 });
  }
}
