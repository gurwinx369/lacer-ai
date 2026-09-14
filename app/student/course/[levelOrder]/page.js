import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { verifyAndGetStudentLevel } from '@/lib/student-course';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  return {
    title: `Level ${resolvedParams.levelOrder} — Lacer AI`,
  };
}

export default async function StudentLevelPage({ params }) {
  const session = await getSession();
  
  if (!session) redirect('/student/login');
  if (session.role !== 'student') redirect('/teacher/dashboard');

  const resolvedParams = await params;
  const levelOrder = parseInt(resolvedParams.levelOrder, 10);

  if (isNaN(levelOrder) || levelOrder < 1) {
    redirect('/student/dashboard');
  }

  // Uses the same helper as the API, preventing duplication of DB calls and auth logic
  const result = await verifyAndGetStudentLevel(levelOrder);

  if (result.error) {
    // If locked or not found, redirect to dashboard.
    // The API returns 403 or 404, but for the page, a redirect is appropriate UX.
    redirect('/student/dashboard');
  }

  const { level } = result;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center gap-4">
          <Link
            href="/student/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Level {level.levelOrder}</span>
            <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">{level.title}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-8">
          
          <div className="border-b border-white/10 pb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-3">{level.title}</h1>
            {level.description && (
              <p className="text-gray-400 text-lg leading-relaxed">
                {level.description}
              </p>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Concepts to Learn
            </h2>
            
            <div className="grid gap-4">
              {level.concepts.map((concept) => (
                <div key={concept.conceptOrder} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-sm shrink-0">
                      {concept.conceptOrder}
                    </div>
                    <div>
                      <h3 className="font-medium text-white mb-1">{concept.title}</h3>
                      {concept.description && (
                        <p className="text-sm text-gray-400">{concept.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Placeholder */}
          <div className="mt-12 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Assessment coming next</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Quizzes and mastery tracking will be available here soon. For now, focus on understanding the concepts taught in class.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
