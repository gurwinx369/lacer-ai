import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import CourseSetupForm from './CourseSetupForm';

export const metadata = {
  title: 'Course Setup — Lacer AI',
  description: 'Set up the DSA course with syllabus and reference video',
};

export default async function CourseSetupPage() {
  const session = await getSession();
  if (!session) redirect('/teacher/login');
  if (session.role !== 'teacher') redirect('/teacher/login');

  // Fetch existing course to pre-fill the form.
  let existingCourse = null;
  try {
    await connectDB();
    existingCourse = await Course.findOne({
      slug: 'dsa',
      createdBy: session.userId,
    }).lean();
  } catch (err) {
    console.error('[CourseSetupPage] DB error:', err.message);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight text-[var(--foreground)]">
            Lacer <span className="text-indigo-600">AI</span>
          </span>
          <Link
            href="/teacher/dashboard"
            className="group flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-card)] px-3.5 py-1.5 rounded-full border border-[var(--border)] shadow-sm hover:shadow active:scale-95 transition-all duration-200"
          >
            <span className="transform transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 stagger-item">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">DSA Course Setup</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)] max-w-2xl">
            Provide the course syllabus and a reference YouTube video. Lacer AI will extract
            learning levels, concepts, and objectives.
          </p>
        </div>

        <CourseSetupForm
          existingCourse={existingCourse ? JSON.parse(JSON.stringify(existingCourse)) : null}
        />
      </main>
    </div>
  );
}
