import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { verifyAndGetStudentLevel } from '@/lib/student-course';

export async function GET(request, { params }) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (session.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden. Students only.' }, { status: 403 });
  }

  // Next.js passes params asynchronously in App Router for Next.js >= 14 sometimes, but wait, `params.levelOrder` is available.
  // We'll await params just in case for Next.js 15 compatibility, but for Next.js <15 it's synchronous. Next.js 16 (Turbopack) is used here.
  const resolvedParams = await params;
  const levelOrder = parseInt(resolvedParams.levelOrder, 10);

  if (isNaN(levelOrder) || levelOrder < 1) {
    return NextResponse.json({ error: 'Invalid levelOrder' }, { status: 400 });
  }

  try {
    const result = await verifyAndGetStudentLevel(levelOrder);
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('[GET /api/student/course/:levelOrder] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
