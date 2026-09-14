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
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-white/10 bg-white/5">
      {/* Level identity */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-bold shrink-0">
          {levelOrder}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{levelTitle}</p>
          {status === 'error' && (
            <p className="text-xs text-red-400 mt-0.5 truncate">{errorMsg}</p>
          )}
        </div>
      </div>

      {/* Action / status badge */}
      <div className="shrink-0">
        {status === 'loading' && (
          <span className="text-xs text-gray-500 animate-pulse">Checking...</span>
        )}
        {status === 'ready' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            5 Quizzes Ready
          </span>
        )}
        {status === 'generating' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors active:scale-95"
          >
            {status === 'error' ? 'Retry' : 'Generate 5 Quizzes'}
          </button>
        )}
      </div>
    </div>
  );
}
