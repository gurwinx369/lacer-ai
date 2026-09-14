'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RoadmapLevel from './RoadmapLevel';

/* ── SVG Spine ─────────────────────────────────────────────────────────────
   Measures actual circle DOM positions after paint, generates a smooth
   cubic-bezier S-path through them. Re-runs on resize.
──────────────────────────────────────────────────────────────────────────── */
function SerpentineSpine({ pathData, width, height }) {
  if (!pathData) return null;
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Thick grey track */}
      <path
        d={pathData}
        stroke="#e2e8f0"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Lighter inner track for depth */}
      <path
        d={pathData}
        stroke="#f1f5f9"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function DashboardClient({ studentName }) {
  const router = useRouter();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Spine state */
  const roadmapRef = useRef(null);
  const [spinePath, setSpinePath] = useState(null);
  const [spineSize, setSpineSize] = useState({ w: 0, h: 0 });

  /* ── Fetch course ── */
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

        if (!res.ok) throw new Error('Failed to load course data.');

        const data = await res.json();
        setCourseData(data);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
    return () => controller.abort();
  }, [router]);

  /* ── Compute serpentine SVG path from actual circle positions ── */
  const computeSpine = useCallback(() => {
    const container = roadmapRef.current;
    if (!container) return;

    const circles = container.querySelectorAll('[data-node-circle]');
    if (circles.length < 2) return;

    const containerRect = container.getBoundingClientRect();

    const pts = Array.from(circles).map((circle) => {
      const r = circle.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - containerRect.left,
        y: r.top + r.height / 2 - containerRect.top,
      };
    });

    /* Build smooth cubic-bezier path through every point.
       Control points sit at the horizontal midpoint between adjacent nodes,
       creating the characteristic Duolingo S-curve. */
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const c = pts[i];
      const midY = (p.y + c.y) / 2;
      // CP1: straight down from previous node; CP2: straight up to current node
      d += ` C${p.x},${midY} ${c.x},${midY} ${c.x},${c.y}`;
    }

    setSpinePath(d);
    setSpineSize({ w: containerRect.width, h: containerRect.height });
  }, []);

  /* Run after levels paint, and on every resize */
  useEffect(() => {
    if (!courseData?.levels?.length) return;

    /* rAF ensures the browser has committed layout before measuring */
    const raf = requestAnimationFrame(() => {
      computeSpine();
    });

    window.addEventListener('resize', computeSpine);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', computeSpine);
    };
  }, [courseData, computeSpine]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/student/login');
      router.refresh();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen text-stone-900" style={{ background: '#F2EDE6' }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/[0.06] shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter text-stone-900">
            Lacer<span className="text-indigo-500 ml-px">AI</span>
          </span>

          <div className="flex items-center gap-4 bg-white border border-black/[0.06] shadow-sm rounded-full py-1.5 px-2 pl-4">
            <span className="hidden text-sm font-bold text-stone-600 sm:block">{studentName}</span>
            <button
              onClick={handleLogout}
              className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-2xl px-4 py-12 pb-32">
        {loading ? (
          <div className="animate-pulse space-y-8 flex flex-col items-center pt-8">
            <div className="h-28 w-full max-w-sm bg-zinc-200 rounded-[2rem]" />
            <div className="flex flex-col items-center gap-10 w-full">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 w-24 bg-zinc-200 rounded-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-center shadow-sm max-w-md mx-auto stagger-item">
            <p className="text-rose-600 font-bold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 btn-press-ghost rounded-xl px-6 py-2.5 text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : !courseData?.course ? (
          <div className="rounded-[2.5rem] border border-black/[0.04] bg-white p-12 text-center shadow-sm max-w-md mx-auto stagger-item">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-3">No Course Yet</h2>
            <p className="text-zinc-500 text-sm font-medium">
              Your teacher hasn&apos;t published the learning roadmap yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* ── Hero ── */}
            <section className="text-center stagger-item" style={{ animationDelay: '0ms' }}>
              <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-indigo-600 mb-4">
                Your Learning Path
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 mb-3 leading-none">
                {courseData.course.title}
              </h1>
              <p className="text-base text-zinc-500 max-w-lg mx-auto font-medium">
                {courseData.course.description || 'Follow the path to master Data Structures & Algorithms.'}
              </p>
            </section>

            {/* ── Serpentine Roadmap ── */}
            <section
              ref={roadmapRef}
              className="relative pb-16 pt-4"
              style={{ minHeight: `${courseData.levels.length * 220}px` }}
            >
              {/* SVG spine drawn through actual node positions */}
              <SerpentineSpine
                pathData={spinePath}
                width={spineSize.w}
                height={spineSize.h}
              />

              {/* Level nodes — spine reads their data-node-circle positions */}
              <div className="flex flex-col items-center gap-0">
                {courseData.levels.map((level, idx) => (
                  <RoadmapLevel
                    key={level.levelOrder}
                    level={level}
                    index={idx}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
