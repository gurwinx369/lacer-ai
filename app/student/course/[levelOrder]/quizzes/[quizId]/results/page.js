'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
      .then((res) => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
      .then(({ status, ok, data }) => {
        if (!ok) {
          setError(data.error || 'Failed to load results.');
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Network error loading results.');
        setLoading(false);
      });
  }, [levelOrder, quizId, attemptId]);

  if (!attemptId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white p-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 max-w-md w-full text-center">
          <p className="text-red-400">No attempt specified.</p>
          <Link href={`/student/course/${levelOrder}`} className="mt-4 inline-block text-sm text-gray-400 hover:text-white">
            ← Back to Level
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white p-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 max-w-md w-full text-center">
          <p className="text-red-400">{error}</p>
          <Link href={`/student/course/${levelOrder}`} className="mt-4 inline-block text-sm text-gray-400 hover:text-white">
            ← Back to Level
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { attempt, concepts, strengths, areasToImprove } = data;

  let overallInterpretation = "You're developing this concept. Keep practicing.";
  if (attempt.percentage >= 80) {
    overallInterpretation = "Strong performance. Keep building on it.";
  } else if (attempt.percentage < 60) {
    overallInterpretation = "This material needs more practice.";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 p-4">
      <main className="mx-auto max-w-2xl mt-8 sm:mt-12 space-y-8">
        
        {/* OVERALL RESULT */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-100 mb-6">Quiz Completed</h1>
          
          <div className="flex justify-center items-center gap-6 mb-4">
            <div className="text-center">
              <span className="block text-5xl font-black text-indigo-400">{attempt.score}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider mt-1 block">Correct</span>
            </div>
            <div className="text-4xl font-light text-white/20">/</div>
            <div className="text-center">
              <span className="block text-5xl font-black text-white">{attempt.totalQuestions}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider mt-1 block">Total</span>
            </div>
          </div>
          
          <div className="inline-block mt-4 px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold mb-6">
            {attempt.percentage}%
          </div>

          <p className="text-gray-300">{overallInterpretation}</p>
        </section>

        {/* CONCEPT PERFORMANCE */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100 mb-4 px-1">Concept Performance</h2>
          
          <div className="grid gap-3">
            {concepts.map((c) => (
              <div key={c.concept} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="mb-2 sm:mb-0">
                  <h3 className="font-medium text-gray-200">{c.concept}</h3>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {c.correct} / {c.total} correct · {c.accuracy}%
                  </div>
                </div>
                
                <div>
                  {c.masteryVerdict ? (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                      c.masteryVerdict === 'MASTERY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      c.masteryVerdict === 'KNOWLEDGE_GAP' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                      c.masteryVerdict === 'INSUFFICIENT_DATA' ? 'bg-gray-500/10 border-gray-500/20 text-gray-400' :
                      'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {c.masteryVerdict.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-500/10 border-gray-500/20 text-gray-400">
                      NOT ENOUGH DATA
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* STRENGTHS & AREAS TO IMPROVE */}
        <div className="grid sm:grid-cols-2 gap-4">
          <section className="p-5 rounded-xl border border-white/10 bg-white/5">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Strengths
            </h3>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map(s => (
                  <li key={s} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No clear strengths in this attempt.</p>
            )}
          </section>

          <section className="p-5 rounded-xl border border-white/10 bg-white/5">
            <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Needs Attention
            </h3>
            {areasToImprove.length > 0 ? (
              <ul className="space-y-2">
                {areasToImprove.map(a => (
                  <li key={a} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-rose-500 mt-0.5">•</span> {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No major weak areas detected.</p>
            )}
          </section>
        </div>

        <div className="pt-4 pb-8">
          <Link
            href={`/student/course/${levelOrder}`}
            className="flex w-full items-center justify-center py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all duration-150 font-medium text-white shadow-lg shadow-indigo-500/20"
          >
            Back to Level
          </Link>
        </div>

      </main>
    </div>
  );
}

export default function QuizResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading results...</div>}>
      <QuizResultsContent />
    </Suspense>
  );
}
