'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import YoutubePlayer from '@/components/YoutubePlayer';

const VERDICT_CONFIG = {
  MASTERY:          { label: 'Mastered',       bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  KNOWLEDGE_GAP:    { label: 'Knowledge Gap',   bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-500',    bar: 'bg-rose-400'   },
  NEEDS_PRACTICE:   { label: 'Needs Practice',  bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500',   bar: 'bg-amber-400'  },
  INSUFFICIENT_DATA:{ label: 'Insufficient',    bg: 'bg-stone-50',   border: 'border-stone-200',   text: 'text-stone-500',   dot: 'bg-stone-300',   bar: 'bg-stone-300'  },
};

function ScoreDial({ pct }) {
  /* Simple filled ring using conic-gradient */
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <div
        className="rounded-full"
        style={{
          width: 120, height: 120,
          background: `conic-gradient(${color} ${pct * 3.6}deg, #e7e5e0 0deg)`,
        }}
      />
      {/* Inner white circle */}
      <div className="absolute inset-[10px] rounded-full bg-white flex flex-col items-center justify-center shadow-sm">
        <span className="text-2xl font-black text-stone-900 leading-none">{pct}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">Score</span>
      </div>
    </div>
  );
}

function QuizResultsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const levelOrder = params.levelOrder;
  const quizId = params.quizId;
  const attemptId = searchParams.get('attemptId');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) return;
    fetch(`/api/student/course/${levelOrder}/quizzes/${quizId}/results?attemptId=${attemptId}`)
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) setError(d.error || 'Failed to load results.');
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Network error loading results.');
        setLoading(false);
      });
  }, [levelOrder, quizId, attemptId]);

  /* ── No attemptId ── */
  if (!attemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F2EDE6' }}>
        <div className="rounded-2xl bg-white border border-rose-200 p-8 max-w-sm w-full text-center shadow-sm">
          <p className="text-rose-600 font-medium">No attempt specified.</p>
          <Link href={`/student/course/${levelOrder}`} className="mt-4 inline-block text-sm text-stone-400 hover:text-stone-700 font-medium">← Back to Level</Link>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#F2EDE6' }}>
        <div className="flex gap-1.5">
          {[0,1,2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }}/>
          ))}
        </div>
        <p className="text-sm font-medium text-stone-400">Loading results…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F2EDE6' }}>
        <div className="rounded-2xl bg-white border border-rose-200 p-8 max-w-sm w-full text-center shadow-sm">
          <p className="text-rose-600 font-medium">{error}</p>
          <Link href={`/student/course/${levelOrder}`} className="mt-4 inline-block text-sm text-stone-400 hover:text-stone-700 font-medium">← Back to Level</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { attempt, concepts, strengths, areasToImprove, intervention } = data;
  const pct = attempt.percentage;

  const overallMsg =
    pct >= 80 ? "Strong work — you're building solid foundations." :
    pct >= 60 ? "Good effort. A little more practice and you'll nail it." :
    "This topic needs more attention. Review the focused videos.";

  const scoreColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-600';
  const scoreBg    = pct >= 80 ? 'bg-emerald-50 border-emerald-200' : pct >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';

  return (
    <div className="min-h-screen pb-20" style={{ background: '#F2EDE6' }}>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/[0.06] shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <Link
            href={`/student/course/${levelOrder}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors active:scale-95 shrink-0"
            aria-label="Back to level"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 leading-none">Results</p>
            <p className="text-sm font-bold text-stone-900 truncate mt-0.5">Quiz Complete</p>
          </div>
          <span className="ml-auto text-base font-black tracking-tighter text-stone-900 shrink-0">
            Lacer<span className="text-indigo-500">AI</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">

        {/* ── Score Hero ── */}
        <section className="rounded-2xl bg-white border border-stone-200/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-8 stagger-item" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Dial */}
            <ScoreDial pct={pct} />

            {/* Stats */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-2xl font-black tracking-tighter text-stone-900 mb-1">Quiz Complete</h1>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">{overallMsg}</p>

              {/* Score fraction */}
              <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 ${scoreBg}`}>
                <span className={`text-2xl font-black ${scoreColor}`}>{attempt.score}</span>
                <span className="text-stone-400 text-lg font-light">/</span>
                <span className="text-stone-600 text-lg font-bold">{attempt.totalQuestions}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-1">correct</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Learning Gap Intervention ── */}
        {intervention && (
          <section className="rounded-2xl bg-white border border-amber-200 shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden stagger-item" style={{ animationDelay: '60ms' }}>
            {/* Amber top bar */}
            <div className="h-1 bg-amber-400 w-full" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 border border-amber-200">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Learning Gap Detected</p>
                  <h2 className="text-base font-bold text-stone-900">Focus on: <span className="text-amber-700">{intervention.concept}</span></h2>
                </div>
              </div>

              {intervention.available ? (
                <div className="space-y-4">
                  <p className="text-sm text-stone-500">Here&apos;s the exact section of the lesson that covers this concept.</p>
                  <YoutubePlayer
                    videoId={intervention.video.videoId}
                    startSeconds={intervention.video.startSeconds}
                    endSeconds={intervention.video.endSeconds}
                  />
                  <p className="text-xs text-stone-400 text-center">After watching, re-attempt the quiz to track your improvement.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
                  <p className="text-sm text-stone-500">A targeted video hasn&apos;t been configured for this concept yet.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Concept Performance ── */}
        {concepts && concepts.length > 0 && (
          <section className="rounded-2xl bg-white border border-stone-200/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-6 sm:p-8 stagger-item" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-black/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Concept Performance</span>
              <div className="h-px flex-1 bg-black/[0.06]" />
            </div>

            <div className="grid gap-3">
              {concepts.map((c) => {
                const cfg = VERDICT_CONFIG[c.masteryVerdict] || VERDICT_CONFIG.INSUFFICIENT_DATA;
                const barPct = Math.round((c.correct / Math.max(c.total, 1)) * 100);
                return (
                  <div key={c.concept} className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
                    <div className="flex items-center justify-between gap-4 mb-2.5">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-stone-900 truncate">{c.concept}</h3>
                        <p className="text-xs text-stone-400 mt-0.5">{c.correct}/{c.total} correct · {c.accuracy}%</p>
                      </div>
                      {c.masteryVerdict && c.masteryVerdict !== 'INSUFFICIENT_DATA' && (
                        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}/>
                          {cfg.label}
                        </span>
                      )}
                    </div>
                    {/* Accuracy bar */}
                    <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Strengths & Areas to improve ── */}
        <div className="grid sm:grid-cols-2 gap-4 stagger-item" style={{ animationDelay: '180ms' }}>
          {/* Strengths */}
          <div className="rounded-2xl bg-white border border-stone-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Strengths</h3>
            </div>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-stone-600">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"/>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">No clear strengths in this attempt.</p>
            )}
          </div>

          {/* Needs Attention */}
          <div className="rounded-2xl bg-white border border-stone-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
                <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">Needs Attention</h3>
            </div>
            {areasToImprove.length > 0 ? (
              <ul className="space-y-2">
                {areasToImprove.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-stone-600">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400"/>
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">No major weak areas detected.</p>
            )}
          </div>
        </div>

        {/* ── Back CTA ── */}
        <div className="pt-2 pb-4 stagger-item" style={{ animationDelay: '240ms' }}>
          <Link
            href={`/student/course/${levelOrder}`}
            className="btn-press-indigo flex w-full items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Level
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function QuizResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#F2EDE6' }}>
        <div className="flex gap-1.5">
          {[0,1,2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }}/>
          ))}
        </div>
        <p className="text-sm font-medium text-stone-400">Loading results…</p>
      </div>
    }>
      <QuizResultsContent />
    </Suspense>
  );
}
