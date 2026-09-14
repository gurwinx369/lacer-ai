'use client';

import { useState, useEffect } from 'react';

/**
 * QuizGenerationControl
 *
 * Reusable client component for per-level quiz generation.
 * Fetches quiz-status on mount when courseConfirmed === true.
 * Calls existing POST /api/teacher/course/level/[levelOrder]/generate-quizzes.
 * Treats HTTP 409 as "already ready" (idempotent).
 *
 * Props:
 *   levelOrder      {number} — 1-based level order
 *   levelTitle      {string} — displayed name
 *   courseConfirmed {boolean}
 */
export default function QuizGenerationControl({ levelOrder, levelTitle, courseConfirmed }) {
  // 'loading' | 'idle' | 'generating' | 'ready' | 'error'
  const [status, setStatus] = useState(courseConfirmed ? 'loading' : 'idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!courseConfirmed) return;
    let cancelled = false;
    fetch(`/api/teacher/course/level/${levelOrder}/quiz-status`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setStatus(d.count >= 5 ? 'ready' : 'idle');
      })
      .catch(() => {
        if (!cancelled) setStatus('idle');
      });
    return () => { cancelled = true; };
  }, [courseConfirmed, levelOrder]);

  async function handleGenerate() {
    if (status === 'generating' || status === 'ready' || !courseConfirmed) return;
    setStatus('generating');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/teacher/course/level/${levelOrder}/generate-quizzes`, {
        method: 'POST',
      });
      if (res.status === 409 || res.ok) {
        setStatus('ready');
        return;
      }
      const data = await res.json();
      setStatus('error');
      setErrorMsg(data.error || 'Generation failed. Please try again.');
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors">
      {/* Level identity */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold shrink-0">
          {levelOrder}
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-zinc-900 truncate tracking-tight">{levelTitle}</p>
          {status === 'error' && (
            <p className="text-xs font-semibold text-rose-500 mt-0.5 truncate">{errorMsg}</p>
          )}
        </div>
      </div>

      {/* Action / status badge */}
      <div className="shrink-0 pt-2 sm:pt-0">
        {status === 'loading' && (
          <span className="text-xs font-bold text-zinc-400 animate-pulse uppercase tracking-widest">Checking...</span>
        )}
        {status === 'ready' && (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            5 Quizzes Ready
          </span>
        )}
        {status === 'generating' && (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700">
            <svg className="h-4 w-4 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Generating...
          </span>
        )}
        {(status === 'idle' || status === 'error') && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!courseConfirmed}
            className="btn-press-ghost rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'error' ? 'Retry' : 'Generate 5 Quizzes'}
          </button>
        )}
      </div>
    </div>
  );
}
