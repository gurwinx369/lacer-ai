'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AnalyticsSection from './AnalyticsSection';

function StatCard({ label, value, description, accent }) {
  const accentMap = {
    neutral: 'border-white/10 bg-white/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
  };
  const valueMap = {
    neutral: 'text-white',
    warning: 'text-amber-400',
    success: 'text-emerald-400',
  };

  return (
    <div className={`rounded-xl border p-5 ${accentMap[accent] ?? accentMap.neutral}`}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueMap[accent] ?? valueMap.neutral}`}>{value}</p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
  );
}

function CourseStatusBadge({ status, confirmedAt }) {
  if (confirmedAt) {
    return (
      <span className="shrink-0 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        ✓ Confirmed
      </span>
    );
  }
  const map = {
    draft: { label: 'Draft', cls: 'border-gray-500/30 bg-gray-500/10 text-gray-400' },
    processing: { label: 'Processing…', cls: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' },
    ready: { label: 'Ready to Confirm', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
    failed: { label: 'Failed', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  };
  const { label, cls } = map[status] ?? map.draft;
  return (
    <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function DSACourseSection({ dsaCourse }) {
  const levelCount = dsaCourse?.generatedStructure?.levels?.length ?? 0;
  const conceptCount = dsaCourse?.generatedStructure?.levels?.reduce(
    (sum, l) => sum + (l.concepts?.length ?? 0), 0
  ) ?? 0;

  // No course yet.
  if (!dsaCourse) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Data Structures &amp; Algorithms</h3>
            <p className="mt-1 text-sm text-gray-400">
              Set up the course by providing a reference syllabus and a YouTube video.
              Lacer AI will extract concepts and build the learning roadmap.
            </p>
          </div>
          <CourseStatusBadge status="draft" confirmedAt={null} />
        </div>
        <div className="mt-5">
          <a
            href="/teacher/course/setup"
            id="dsa-setup-link"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 active:scale-[0.98] transition-all duration-150"
          >
            Set Up Course →
          </a>
        </div>
      </div>
    );
  }

  const { status, confirmedAt, processingError } = dsaCourse;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Data Structures &amp; Algorithms</h3>
          {status === 'ready' || status === 'confirmed' || confirmedAt ? (
            <p className="mt-1 text-sm text-gray-400">
              {levelCount} levels · {conceptCount} concepts generated
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-400">
              {status === 'processing'
                ? 'Gemini is analyzing your syllabus…'
                : status === 'failed'
                ? 'Processing failed. Please retry.'
                : 'Syllabus and reference video saved. Ready to process.'}
            </p>
          )}
        </div>
        <CourseStatusBadge status={status} confirmedAt={confirmedAt} />
      </div>

      {/* Processing error */}
      {status === 'failed' && processingError && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
          {processingError}
        </div>
      )}

      {/* Action row */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {(status === 'draft' || status === 'failed') && (
          <a
            href="/teacher/course/setup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 active:scale-[0.98] transition-all duration-150"
          >
            {status === 'failed' ? 'Retry Setup' : 'Continue Setup'}
          </a>
        )}
        {status === 'processing' && (
          <a
            href="/teacher/course/setup"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all duration-150"
          >
            View Progress
          </a>
        )}
        {status === 'ready' && !confirmedAt && (
          <a
            href="/teacher/course/review"
            id="review-structure-link"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 active:scale-[0.98] transition-all duration-150"
          >
            Review &amp; Confirm →
          </a>
        )}
        {confirmedAt && levelCount > 0 && (
          <a
            href="/teacher/course/review"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all duration-150"
          >
            View Structure
          </a>
        )}
        {status !== 'processing' && (
          <a
            href="/teacher/course/setup"
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors duration-150"
          >
            Edit setup
          </a>
        )}
      </div>
    </div>
  );
}

export default function DashboardShell({ teacherName, dsaCourse, analytics }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/teacher/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight">
            Lacer <span className="text-indigo-400">AI</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block truncate max-w-[200px]">
              {teacherName}
            </span>
            <button
              id="teacher-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Monitor your class and manage the DSA course.</p>
        </div>

        {/* DSA Course */}
        <section aria-label="DSA course">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Current Course
          </h2>
          <DSACourseSection dsaCourse={dsaCourse} />
        </section>

        {/* Analytics Section */}
        {analytics && <AnalyticsSection analytics={analytics} />}
      </main>
    </div>
  );
}
