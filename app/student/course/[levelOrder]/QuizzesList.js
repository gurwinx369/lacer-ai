'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function QuizzesList({ levelOrder }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/student/course/${levelOrder}/quizzes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setQuizzes(data.quizzes || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Network error loading quizzes.');
        setLoading(false);
      });
  }, [levelOrder]);

  /* ── Section header shared between all states ── */
  const SectionHeader = () => (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-black/[0.06]" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Assessment Quizzes</span>
      <div className="h-px flex-1 bg-black/[0.06]" />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionHeader />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[72px] rounded-2xl bg-[#EDE8E1] shimmer"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <SectionHeader />
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/>
          </svg>
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader />
        <div className="rounded-2xl border border-dashed border-stone-300 bg-[#EDE8E1] px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-200">
            <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-600">No quizzes yet</h3>
          <p className="mt-1 text-xs text-stone-400 max-w-[28ch] mx-auto leading-relaxed">
            Quizzes haven&apos;t been generated for this level yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader />
      <div className="grid gap-3 sm:grid-cols-2">
        {quizzes.map((quiz, i) => (
          <Link
            key={quiz._id || quiz.serialNumber}
            href={`/student/course/${levelOrder}/quizzes/${quiz._id}`}
          className="group block rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-150 hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none stagger-item"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              {/* Number badge */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white transition-opacity group-hover:opacity-90">
                {quiz.serialNumber}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-stone-900 leading-snug truncate">{quiz.title}</h3>
                <p className="mt-0.5 text-xs text-stone-400 font-medium">Take Quiz</p>
              </div>

              {/* Arrow */}
              <svg
                className="h-4 w-4 shrink-0 text-zinc-300 transition-transform duration-150 group-hover:translate-x-1 group-hover:text-zinc-500"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
