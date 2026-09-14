'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function LevelCard({ level, index }) {
  const [open, setOpen] = useState(index === 0); // First level open by default.

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Level header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors duration-150"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-bold shrink-0">
            {level.order ?? index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{level.title}</p>
            {level.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{level.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-xs text-gray-500">{level.concepts?.length ?? 0} concepts</span>
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Concepts */}
      {open && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {(level.concepts ?? []).map((concept, ci) => (
            <div key={ci} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-600 mt-0.5 font-mono">
                  {(level.order ?? index + 1)}.{concept.order ?? ci + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{concept.title}</p>
                  {concept.description && (
                    <p className="text-xs text-gray-400 mt-1">{concept.description}</p>
                  )}
                  {concept.learningObjectives?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {concept.learningObjectives.map((obj, oi) => (
                        <li key={oi} className="flex items-start gap-2 text-xs text-gray-500">
                          <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseReview({ course }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(!!course.confirmedAt);
  const [error, setError] = useState('');

  const levels = course.generatedStructure?.levels ?? [];

  async function handleConfirm() {
    setError('');
    setConfirming(true);
    try {
      const res = await fetch('/api/teacher/course/confirm', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Confirmation failed. Please try again.');
        return;
      }
      setConfirmed(true);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Course</p>
          <p className="text-sm font-semibold text-white mt-0.5">{course.title}</p>
        </div>
        <div className="w-px h-8 bg-white/10 hidden sm:block" />
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Levels</p>
          <p className="text-sm font-semibold text-white mt-0.5">{levels.length}</p>
        </div>
        <div className="w-px h-8 bg-white/10 hidden sm:block" />
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Concepts</p>
          <p className="text-sm font-semibold text-white mt-0.5">
            {levels.reduce((sum, l) => sum + (l.concepts?.length ?? 0), 0)}
          </p>
        </div>
        {course.youtubeUrl && (
          <>
            <div className="w-px h-8 bg-white/10 hidden sm:block" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Reference Video</p>
              <a
                href={course.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-0.5 block truncate max-w-[200px]"
              >
                {course.youtubeUrl}
              </a>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Level cards */}
      <div className="space-y-3">
        {levels.map((level, i) => (
          <LevelCard key={i} level={level} index={i} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
        {confirmed ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Structure Confirmed
            </span>
            <span className="text-xs text-gray-500">
              Course structure is ready for student progression.
            </span>
          </div>
        ) : (
          <button
            id="confirm-structure-btn"
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            aria-busy={confirming}
            className="
              flex items-center justify-center gap-2
              rounded-lg bg-emerald-600 px-6 py-2.5
              text-sm font-medium text-white
              hover:bg-emerald-500 active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
            "
          >
            {confirming ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
                Confirming…
              </>
            ) : (
              '✓ Confirm Structure'
            )}
          </button>
        )}

        <a
          href="/teacher/course/setup"
          className="text-sm text-gray-400 hover:text-white transition-colors duration-150"
        >
          ← Edit Setup & Re-process
        </a>
      </div>
    </div>
  );
}
