import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import CourseReview from './CourseReview';

export const metadata = {
  title: 'Review Course Structure — Lacer AI',
  description: 'Review and confirm the AI-generated DSA course structure',
};

export default async function CourseReviewPage() {
  const session = await getSession();
  if (!session) redirect('/teacher/login');
  if (session.role !== 'teacher') redirect('/teacher/login');

  let course = null;
  try {
    await connectDB();
    course = await Course.findOne({
      slug: 'dsa',
      createdBy: session.userId,
    }).lean();
  } catch (err) {
    console.error('[CourseReviewPage] DB error:', err.message);
  }

  // If no course or not ready yet, redirect to setup.
  if (!course || course.status !== 'ready') {
    redirect('/teacher/course/setup');
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* ── Airy, Borderless Header ── */}
      <header className="pt-6 pb-2 px-4 sm:px-8 max-w-[1400px] mx-auto flex items-center justify-between">
        {/* Brand */}
        <span className="text-xl font-bold tracking-tighter text-zinc-900">
          Lacer
          <span className="text-emerald-500 ml-1">AI</span>
        </span>

        {/* Back to Dashboard */}
        <a
          href="/teacher/dashboard"
          className="flex items-center gap-2 rounded-full bg-white border border-black/[0.04] shadow-sm px-4 py-1.5 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M11 6H1M6 11L1 6L6 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </a>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12 pb-24">
        <div className="mb-10 max-w-3xl flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-900 leading-none">
              Review Structure
            </h1>
            <p className="mt-4 text-base text-zinc-500 leading-relaxed">
              Lacer AI has analyzed your syllabus and generated the course roadmap. Review it carefully, confirm the structure, and map any relevant video segments.
            </p>
          </div>
          {course.confirmedAt && (
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Confirmed
            </span>
          )}
        </div>

        <CourseReview course={JSON.parse(JSON.stringify(course))} />
      </main>
    </div>
  );
}
