import { redirect } from 'next/navigation';
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
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">DSA Course Setup</h1>
          <p className="mt-1 text-sm text-gray-400">
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
