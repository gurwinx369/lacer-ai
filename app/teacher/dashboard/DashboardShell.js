'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      <p className={`mt-2 text-3xl font-bold ${valueMap[accent] ?? valueMap.neutral}`}>
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default function DashboardShell({ teacherName, stats }) {
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
      {/* Header */}
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
              className="
                text-sm text-gray-400 hover:text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Monitor your class and manage the DSA course.
          </p>
        </div>

        {/* Metric cards */}
        <section aria-label="Class overview">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Class Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Students"
              value={stats.studentCount}
              description="Enrolled in DSA course"
              accent="neutral"
            />
            <StatCard
              label="Lagging Students"
              value={stats.laggingCount}
              description="Below mastery threshold"
              accent="warning"
            />
            <StatCard
              label="Good Standing"
              value={stats.goodCount}
              description="On track or above"
              accent="success"
            />
          </div>

          {stats.studentCount === 0 && (
            <p className="mt-3 text-xs text-gray-600 italic">
              Mastery data will appear once students complete assessments.
            </p>
          )}
        </section>

        {/* DSA Course section */}
        <section aria-label="DSA course">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Current Course
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Data Structures &amp; Algorithms
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Set up the course by providing a reference syllabus and a YouTube video.
                  Lacer AI will extract concepts and build the learning roadmap.
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                Not started
              </span>
            </div>

            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-xs text-gray-500">
                Course setup — syllabus upload and video processing — will be available in the next release.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
