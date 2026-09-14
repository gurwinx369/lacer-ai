import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course, { isValidYoutubeUrl } from '@/models/Course';
import { extractPdfText } from '@/lib/parsePdf';

const DSA_SLUG = 'dsa';
const DSA_TITLE = 'Data Structures & Algorithms';

// Next.js App Router natively supports request.formData()

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

// POST /api/teacher/course
// Accepts multipart/form-data with:
//   - syllabusFile (File, required) — PDF syllabus document
//   - youtubeUrl   (string, required) — reference video URL
//
// Extracts PDF text server-side; stores text + metadata, not the binary PDF.
export async function POST(request) {
  const auth = await authorizeTeacher();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Parse multipart form data.
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const syllabusFile = formData.get('syllabusFile');
  const youtubeUrl   = (formData.get('youtubeUrl') ?? '').toString().trim();

  // ── YouTube URL validation ─────────────────────────────────────────────────
  if (!youtubeUrl || !isValidYoutubeUrl(youtubeUrl)) {
    return NextResponse.json(
      { error: 'Please provide a valid YouTube URL (youtube.com or youtu.be).' },
      { status: 400 }
    );
  }

  // ── PDF validation + extraction ────────────────────────────────────────────
  // extractPdfText validates type, size, magic bytes, and content length.
  let syllabusText;
  let fileMeta;
  try {
    const result = await extractPdfText(syllabusFile);
    syllabusText = result.text;
    fileMeta     = result.meta;
  } catch (pdfErr) {
    return NextResponse.json({ error: pdfErr.message }, { status: 400 });
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  try {
    await connectDB();

    const course = await Course.findOneAndUpdate(
      { slug: DSA_SLUG, createdBy: auth.session.userId },
      {
        $set: {
          title:           DSA_TITLE,
          slug:            DSA_SLUG,
          syllabus:        syllabusText,
          syllabusFileMeta: fileMeta,
          youtubeUrl,
          // Reset to draft so teacher must re-process after uploading new PDF.
          status:           'draft',
          processingError:  null,
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
    return NextResponse.json({ error: 'Failed to save course.' }, { status: 500 });
  }
}
