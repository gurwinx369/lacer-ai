'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AnalyticsSection from './AnalyticsSection';

/* ─────────────────────────────────────────────────────────────────────────
   Status badge
───────────────────────────────────────────────────────────────────────── */
function CourseStatusBadge({ status, confirmedAt }) {
  if (confirmedAt) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
          <circle cx="4" cy="4" r="4" fill="#10b981" />
        </svg>
        Active
      </span>
    );
  }
  const map = {
    draft:      { label: 'Draft',       dot: '#9ca3af', cls: 'border-zinc-200 bg-zinc-50 text-zinc-600' },
    processing: { label: 'Processing',  dot: '#818cf8', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
    ready:      { label: 'Ready',       dot: '#f59e0b', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
    failed:     { label: 'Failed',      dot: '#f43f5e', cls: 'border-rose-200 bg-rose-50 text-rose-700' },
  };
  const { label, dot, cls } = map[status] ?? map.draft;
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill={dot} />
      </svg>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Expandable description toggle
───────────────────────────────────────────────────────────────────────── */
function ExpandableText({ text, maxLen = 120 }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  if (text.length <= maxLen) {
    return <p className="text-sm text-zinc-500 leading-relaxed">{text}</p>;
  }
  return (
    <div>
      <p className="text-sm text-zinc-500 leading-relaxed">
        {open ? text : `${text.slice(0, maxLen).trimEnd()}…`}
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
          aria-label={open ? 'Show less' : 'Show more'}
        >
          {open ? 'show less' : '+ more'}
        </button>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Single level / "Day" card (segmented view of the course)
───────────────────────────────────────────────────────────────────────── */
function DayCard({ level, dayIndex, isFirst }) {
  const conceptCount = level.concepts?.length ?? 0;
  const title = level.title || level.name || `Level ${dayIndex}`;
  const description = level.description || level.summary || '';

  /* Accent stripe colour rotates across a small palette */
  const stripes = [
    { bar: 'bg-emerald-500', day: 'text-emerald-600', ring: 'border-emerald-100' },
    { bar: 'bg-sky-500',     day: 'text-sky-600',     ring: 'border-sky-100'     },
    { bar: 'bg-violet-500',  day: 'text-violet-600',  ring: 'border-violet-100'  },
    { bar: 'bg-amber-500',   day: 'text-amber-600',   ring: 'border-amber-100'   },
    { bar: 'bg-rose-500',    day: 'text-rose-600',    ring: 'border-rose-100'    },
  ];
  const stripe = stripes[(dayIndex - 1) % stripes.length];

  return (
    <div
      className="stagger-item relative flex overflow-hidden rounded-[2rem] border border-black/[0.04] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)]"
      style={{ animationDelay: `${(dayIndex - 1) * 60}ms` }}
    >
      {/* Left accent bar */}
      <div className={`w-1.5 shrink-0 ${stripe.bar} rounded-l-[2rem]`} aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-4 px-6 py-6">
        {/* Day pill + concept count */}
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[11px] font-bold uppercase tracking-widest ${stripe.day}`}>
            Day {dayIndex}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500">
            {conceptCount} {conceptCount === 1 ? 'concept' : 'concepts'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold tracking-tight leading-snug text-zinc-900">
          {title}
        </h3>

        {/* Expandable description */}
        <ExpandableText text={description} maxLen={100} />

        {/* Concept chips (first 4) */}
        {level.concepts && level.concepts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {level.concepts.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className="chip-press cursor-default"
              >
                {c.name || c.title || c}
              </span>
            ))}
            {level.concepts.length > 4 && (
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                +{level.concepts.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Course section (no course yet, or course card with levels)
───────────────────────────────────────────────────────────────────────── */
function DSACourseSection({ dsaCourse }) {
  const levels = dsaCourse?.generatedStructure?.levels ?? [];
  const conceptCount = levels.reduce((sum, l) => sum + (l.concepts?.length ?? 0), 0);
  const { status, confirmedAt, processingError } = dsaCourse ?? {};

  /* ── No course yet ── */
  if (!dsaCourse) {
    return (
      <div className="rounded-[2.5rem] border border-black/[0.04] bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            {/* DSA label chip */}
            <span className="mb-4 inline-block rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
              DSA
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900">Data Structures &amp; Algorithms</h3>
            <p className="mt-2 text-sm text-zinc-500 max-w-lg leading-relaxed">
              Set up the course by providing a reference syllabus and a YouTube video.
              Lacer AI will extract concepts and build the learning roadmap automatically.
            </p>
          </div>
          <CourseStatusBadge status="draft" confirmedAt={null} />
        </div>
        <div className="mt-8">
          <a
            href="/teacher/course/setup"
            id="dsa-setup-link"
            className="btn-press-emerald inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
          >
            Set Up Course
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course header card */}
      <div className="rounded-[2.5rem] border border-black/[0.04] bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Big DSA badge */}
            <div className="shrink-0 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-emerald-50 border border-emerald-200 shadow-sm">
              <span className="text-sm font-black tracking-widest text-emerald-600">DSA</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-zinc-900">Data Structures &amp; Algorithms</h3>
              {(status === 'ready' || status === 'confirmed' || confirmedAt) ? (
                <p className="mt-1.5 text-sm font-medium text-zinc-500">
                  {levels.length} levels · {conceptCount} concepts
                </p>
              ) : (
                <p className="mt-1.5 text-sm font-medium text-zinc-500">
                  {status === 'processing'
                    ? 'Gemini is analyzing your syllabus…'
                    : status === 'failed'
                    ? 'Processing failed — please retry.'
                    : 'Syllabus and video saved. Ready to process.'}
                </p>
              )}
            </div>
          </div>
          <CourseStatusBadge status={status} confirmedAt={confirmedAt} />
        </div>

        {/* Processing error */}
        {status === 'failed' && processingError && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
            {processingError}
          </div>
        )}

        {/* Action row */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {(status === 'draft' || status === 'failed') && (
            <a
              href="/teacher/course/setup"
              className="btn-press-emerald inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
            >
              {status === 'failed' ? 'Retry Setup' : 'Continue Setup'}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}

          {status === 'processing' && (
            <a
              href="/teacher/course/setup"
              className="btn-press-ghost inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="animate-spin text-zinc-400">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 22" strokeLinecap="round"/>
              </svg>
              View Progress
            </a>
          )}

          {status === 'ready' && !confirmedAt && (
            <a
              href="/teacher/course/review"
              id="review-structure-link"
              className="btn-press-amber inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
            >
              Review &amp; Confirm
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}

          {confirmedAt && levels.length > 0 && (
            <a
              href="/teacher/course/review"
              className="btn-press-ghost inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
            >
              View Structure
            </a>
          )}

          {status !== 'processing' && (
            <a
              href="/teacher/course/setup"
              className="text-sm font-medium text-zinc-400 hover:text-zinc-600 transition-colors ml-2"
            >
              Edit setup
            </a>
          )}
        </div>
      </div>

      {/* Level cards (Day 1, Day 2, …) */}
      {levels.length > 0 && (
        <div className="pt-4">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Learning Path — {levels.length} days
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {levels.map((level, idx) => (
              <DayCard
                key={level._id ?? idx}
                level={level}
                dayIndex={idx + 1}
                isFirst={idx === 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main shell
───────────────────────────────────────────────────────────────────────── */
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

  /* Short version of email for the header */
  const displayName = teacherName?.split('@')[0] ?? 'Teacher';

  return (
    <div className="min-h-screen">
      {/* ── Airy, Borderless Header ── */}
      <header className="pt-6 pb-2 px-4 sm:px-8 max-w-[1400px] mx-auto flex items-center justify-between">
        {/* Brand */}
        <span className="text-xl font-bold tracking-tighter text-zinc-900">
          Lacer
          <span className="text-emerald-500 ml-1">AI</span>
        </span>

        {/* Right side - Pill-shaped user menu */}
        <div className="flex items-center gap-4 bg-white border border-black/[0.04] shadow-sm rounded-full py-1.5 px-2 pl-4">
          <span className="hidden text-sm font-medium text-zinc-600 sm:block">
            {teacherName}
          </span>
          <button
            id="teacher-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-12 px-4 pb-24 pt-12 sm:px-8">

        {/* ── Page heading ── */}
        <div className="stagger-item max-w-2xl" style={{ animationDelay: '0ms' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-emerald-600">
            Teacher Dashboard
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-900 leading-none">
            Good morning, {displayName}.
          </h1>
          <p className="mt-4 text-base text-zinc-500 leading-relaxed max-w-[65ch]">
            Monitor your class's progress and manage the Data Structures &amp; Algorithms curriculum.
          </p>
        </div>

        {/* ── DSA Course section ── */}
        <section aria-label="DSA course" className="stagger-item pt-4" style={{ animationDelay: '80ms' }}>
          <div className="mb-6 flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Current Course
            </h2>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <DSACourseSection dsaCourse={dsaCourse} />
        </section>

        {/* ── Analytics ── */}
        {analytics && (
          <section
            aria-label="Class analytics"
            className="stagger-item pt-4"
            style={{ animationDelay: '160ms' }}
          >
            <div className="mb-6 flex items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                Class Overview
              </h2>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>
            <AnalyticsSection analytics={analytics} />
          </section>
        )}
      </main>
    </div>
  );
}
