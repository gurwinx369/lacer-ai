/**
 * GET /api/teacher/concept-mastery/[studentId]?courseId=<id>
 *
 * Teacher reads one student's concept mastery map.
 * Gated to teacher role; server derives identity from session cookie.
 *
 * Response: {
 *   conceptMastery: {
 *     [concept]: { verdict, posterior, nAttempts }
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConceptMastery } from '@/features/concept-mastery/service';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studentId } = await params;
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  if (!studentId || !courseId) {
    return NextResponse.json({ error: 'studentId and courseId are required' }, { status: 400 });
  }

  try {
    const conceptMastery = await getConceptMastery(studentId, courseId);
    if (conceptMastery === null) {
      return NextResponse.json({ conceptMastery: {} }, { status: 200 });
    }
    return NextResponse.json({ conceptMastery }, { status: 200 });
  } catch (err) {
    console.error('[concept-mastery/[studentId]] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
