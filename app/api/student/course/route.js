import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCanonicalDsaCourse, getStudentCoursePayload } from '@/lib/student-course';

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (session.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden. Students only.' }, { status: 403 });
  }

  try {
    const course = await getCanonicalDsaCourse();
    if (!course) {
      return NextResponse.json({ error: 'Course not ready' }, { status: 404 });
    }

    const payload = getStudentCoursePayload(course);
    
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error('[GET /api/student/course] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
