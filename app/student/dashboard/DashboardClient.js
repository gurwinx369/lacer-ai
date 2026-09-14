'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoadmapLevel from './RoadmapLevel';

export default function DashboardClient({ studentName }) {
  const router = useRouter();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchCourse() {
      try {
        const res = await fetch('/api/student/course', { signal });
        
        if (res.status === 401 || res.status === 403) {
          router.push('/student/login');
          return;
        }
        
        if (res.status === 404) {
          setError('Course not found or not ready.');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load course data.');
        }

        const data = await res.json();
        setCourseData(data);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch student course:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();

    return () => controller.abort();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/student/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              Lacer <span className="text-indigo-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-300 font-medium">{studentName}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-12">
        {loading ? (
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-white/5 rounded-2xl border border-white/10"></div>
            <div className="space-y-4">
              <div className="h-40 bg-white/5 rounded-2xl border border-white/10"></div>
              <div className="h-40 bg-white/5 rounded-2xl border border-white/10"></div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-red-400 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors border border-white/10"
            >
              Retry
            </button>
          </div>
        ) : !courseData?.course ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Course Available</h2>
            <p className="text-gray-400 text-sm">Your teacher has not published the learning roadmap yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Hero */}
            <section className="text-center md:text-left">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                {courseData.course.title}
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                {courseData.course.description || 'AI-powered structured learning roadmap'}
              </p>
              <div className="mt-6 inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                Your learning roadmap
              </div>
            </section>

            {/* Roadmap */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                Curriculum
              </h2>
              
              <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {courseData.levels.map((level) => (
                  <RoadmapLevel key={level.levelOrder} level={level} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
