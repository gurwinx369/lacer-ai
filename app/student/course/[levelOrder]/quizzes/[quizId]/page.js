'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const LETTER = ['A', 'B', 'C', 'D', 'E'];

export default function QuizTakingPage() {
  const params = useParams();
  const router = useRouter();
  const levelOrder = params.levelOrder;
  const quizId = params.quizId;

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  /* Animate question card on nav */
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    fetch(`/api/student/course/${levelOrder}/quizzes/${quizId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setQuiz(data.quiz);
          setQuestionStartTime(Date.now());
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Network error loading quiz.');
        setLoading(false);
      });
  }, [levelOrder, quizId]);

  function recordTime(q) {
    const timeSpent = Date.now() - questionStartTime;
    const existing = answers[q.serialNumber];
    const prevTime = existing ? existing.responseTimeMs : 0;
    return {
      selectedAnswer: existing?.selectedAnswer ?? null,
      responseTimeMs: prevTime + timeSpent,
    };
  }

  function handleSelectOption(idx) {
    const q = quiz.questions[currentQuestionIdx];
    const timeSpent = Date.now() - questionStartTime;
    const existing = answers[q.serialNumber];
    const prevTime = existing ? existing.responseTimeMs : 0;
    setAnswers((prev) => ({
      ...prev,
      [q.serialNumber]: { selectedAnswer: idx, responseTimeMs: prevTime + timeSpent },
    }));
    setQuestionStartTime(Date.now());
  }

  function navigate(direction) {
    const q = quiz.questions[currentQuestionIdx];
    setAnswers((prev) => ({ ...prev, [q.serialNumber]: recordTime(q) }));
    setAnimating(true);
    setTimeout(() => {
      setCurrentQuestionIdx((i) => i + direction);
      setQuestionStartTime(Date.now());
      setAnimating(false);
    }, 150);
  }

  function handleNext() {
    if (currentQuestionIdx < quiz.questions.length - 1) navigate(1);
  }

  function handlePrev() {
    if (currentQuestionIdx > 0) navigate(-1);
  }

  async function handleSubmit() {
    if (submitting) return;
    const q = quiz.questions[currentQuestionIdx];
    const finalAnswers = { ...answers, [q.serialNumber]: recordTime(q) };

    const payloadAnswers = quiz.questions.map((question) => ({
      serialNumber: question.serialNumber,
      selectedAnswer: finalAnswers[question.serialNumber]?.selectedAnswer ?? null,
      responseTimeMs: finalAnswers[question.serialNumber]?.responseTimeMs ?? 0,
    }));

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/student/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, answers: payloadAnswers }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/student/course/${levelOrder}/quizzes/${quizId}/results?attemptId=${data.attemptId}`);
      } else {
        setError(data.error || 'Submission failed');
        setSubmitting(false);
      }
    } catch {
      setError('Network error submitting quiz.');
      setSubmitting(false);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#F2EDE6' }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-stone-400">Loading quiz…</p>
      </div>
    );
  }

  /* ── Error before quiz loaded ── */
  if (error && !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F2EDE6' }}>
        <div className="rounded-2xl border border-rose-200 bg-white p-8 max-w-md w-full text-center shadow-sm">
          <p className="text-rose-600 font-medium">{error}</p>
          <Link href={`/student/course/${levelOrder}`} className="mt-4 inline-block text-sm text-stone-400 hover:text-stone-700 font-medium">
            ← Back to Level
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIdx];
  const currentAnswer = answers[currentQuestion.serialNumber]?.selectedAnswer;
  const isLastQuestion = currentQuestionIdx === quiz.questions.length - 1;
  const answeredCount = Object.keys(answers).filter(
    (sn) => answers[sn]?.selectedAnswer !== null && answers[sn]?.selectedAnswer !== undefined
  ).length;
  const progressPct = ((currentQuestionIdx + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F2EDE6' }}>

      {/* ── Header ── */}
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

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-stone-400 leading-none">Quiz</p>
            <p className="text-sm font-bold text-stone-900 truncate mt-0.5">{quiz.title}</p>
          </div>

          {/* Progress fraction */}
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              {currentQuestionIdx + 1} <span className="text-stone-300">of</span> {quiz.questions.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-stone-100 w-full">
          <div
            className="h-full bg-indigo-500 transition-all duration-400 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">

        {/* Submission error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-white px-5 py-4 shadow-sm">
            <svg className="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/>
            </svg>
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        )}

        {/* ── Question card ── */}
        <div
          className="rounded-2xl bg-white border border-stone-200/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-7 sm:p-10 transition-opacity duration-150"
          style={{ opacity: animating ? 0 : 1 }}
        >
          {/* Bubble dots — answered progress */}
          <div className="flex items-center gap-1.5 mb-8">
            {quiz.questions.map((q, i) => {
              const isAnswered = answers[q.serialNumber]?.selectedAnswer !== null &&
                answers[q.serialNumber]?.selectedAnswer !== undefined;
              const isCurrent = i === currentQuestionIdx;
              return (
                <div
                  key={i}
                  className={[
                    'rounded-full transition-all duration-200',
                    isCurrent ? 'h-2 w-6 bg-indigo-500' : isAnswered ? 'h-2 w-2 bg-indigo-300' : 'h-2 w-2 bg-stone-200',
                  ].join(' ')}
                />
              );
            })}
            <span className="ml-auto text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              {answeredCount}/{quiz.questions.length} answered
            </span>
          </div>

          {/* Question text */}
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug mb-8 tracking-tight">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const selected = currentAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={[
                    'w-full text-left rounded-xl border transition-all duration-150 group',
                    'flex items-center gap-4 px-5 py-4',
                    selected
                      ? 'border-indigo-400 bg-indigo-50 shadow-[0_0_0_2px_rgba(99,102,241,0.2)]'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 active:scale-[0.99]',
                  ].join(' ')}
                >
                  {/* Letter badge */}
                  <div className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors duration-150',
                    selected
                      ? 'bg-indigo-500 text-white'
                      : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200',
                  ].join(' ')}>
                    {LETTER[idx]}
                  </div>

                  {/* Option text */}
                  <span className={[
                    'text-sm sm:text-base font-medium transition-colors duration-150',
                    selected ? 'text-indigo-900' : 'text-stone-700',
                  ].join(' ')}>
                    {option}
                  </span>

                  {/* Selected tick */}
                  {selected && (
                    <svg className="ml-auto shrink-0 h-4 w-4 text-indigo-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── Footer nav ── */}
      <footer className="sticky bottom-0 z-40 bg-white border-t border-stone-200/60 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between gap-4">
          {/* Previous */}
          <button
            onClick={handlePrev}
            disabled={currentQuestionIdx === 0 || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-stone-100 border border-stone-200 transition-all duration-150 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
            </svg>
            Previous
          </button>

          {/* Skip indicator for unanswered */}
          {currentAnswer === undefined || currentAnswer === null ? (
            <span className="text-xs text-stone-400 font-medium hidden sm:block">Select an answer to continue</span>
          ) : null}

          {/* Next / Submit */}
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 border-b-4 border-emerald-800 transition-all duration-150 hover:bg-emerald-500 active:translate-y-1 active:border-b-0 active:mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 1.5A6.5 6.5 0 1114.5 8h-1.5A5 5 0 108 3V1.5z" opacity=".4"/>
                    <path d="M14.5 8H16A8 8 0 018 16v-1.5A6.5 6.5 0 0014.5 8z"/>
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  Submit Quiz
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 border-b-4 border-indigo-800 transition-all duration-150 hover:bg-indigo-500 active:translate-y-1 active:border-b-0 active:mt-1 disabled:opacity-50"
            >
              Next
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
