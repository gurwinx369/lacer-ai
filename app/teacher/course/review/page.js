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
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight">
            Lacer <span className="text-indigo-400">AI</span>
          </span>
          <a
            href="/teacher/dashboard"
            className="text-sm text-gray-400 hover:text-white transition-colors duration-150"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Review Generated Structure</h1>
            <p className="mt-1 text-sm text-gray-400">
              Gemini has analyzed your syllabus and generated the course structure below.
              Review it carefully, then confirm to make it available for student progression.
            </p>
          </div>
          {course.confirmedAt && (
            <span className="shrink-0 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              ✓ Confirmed
            </span>
          )}
        </div>

        <CourseReview course={JSON.parse(JSON.stringify(course))} />
      </main>
    </div>
  );
}
