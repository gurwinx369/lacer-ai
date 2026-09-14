'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AssignmentTakingPage() {
  const params = useParams();
  const router = useRouter();
  const levelOrder = params.levelOrder;

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { serialNumber: { selectedAnswer: 0 } }

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`/api/student/course/${levelOrder}/assignment`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setAssignment(data.assignment);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Network error loading assignment.');
        setLoading(false);
      });
  }, [levelOrder]);

  function handleSelectOption(optionIndex) {
    if (result) return;
    const q = assignment.questions[currentQuestionIdx];

    setAnswers(prev => ({
      ...prev,
      [q.serialNumber]: {
        selectedAnswer: optionIndex,
      }
    }));
  }

  function handleNext() {
    if (currentQuestionIdx < assignment.questions.length - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
    }
  }

  function handlePrev() {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(idx => idx - 1);
    }
  }

  async function handleSubmit() {
    if (submitting) return;

    // Ensure all questions are in payload, even if unanswered
    const payloadAnswers = assignment.questions.map(question => ({
      serialNumber: question.serialNumber,
      selectedAnswer: answers[question.serialNumber]?.selectedAnswer ?? null,
    }));

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/student/course/${levelOrder}/assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: payloadAnswers,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(`/student/course/${levelOrder}/assignment/results?attemptId=${data.attemptId}`);
      } else {
        setError(data.error || 'Submission failed');
      }
    } catch {
      setError('Network error submitting assignment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (error && !assignment) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white p-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 max-w-md w-full text-center">
          <p className="text-red-400">{error}</p>
          <Link href={`/student/course/${levelOrder}`} className="mt-4 inline-block text-sm text-gray-400 hover:text-white">← Back to Level</Link>
        </div>
      </div>
    );
  }

  const currentQuestion = assignment.questions[currentQuestionIdx];
  const currentAnswer = answers[currentQuestion.serialNumber]?.selectedAnswer;
  const isLastQuestion = currentQuestionIdx === assignment.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/student/course/${levelOrder}`}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="font-semibold truncate max-w-[200px] sm:max-w-md">{assignment.title}</h1>
          </div>
          <div className="text-sm font-medium text-gray-400">
            {currentQuestionIdx + 1} of {assignment.questions.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/5 w-full">
          <div 
            className="h-full bg-fuchsia-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentQuestionIdx + 1) / assignment.questions.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-8">
          <h2 className="text-xl sm:text-2xl font-medium leading-relaxed">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  currentAnswer === idx
                    ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_0_1px_rgba(217,70,239,1)]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium shrink-0 ${
                    currentAnswer === idx
                      ? 'border-fuchsia-400 bg-fuchsia-500 text-white'
                      : 'border-gray-600 text-gray-400'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`text-sm sm:text-base ${currentAnswer === idx ? 'text-white font-medium' : 'text-gray-300'}`}>
                    {option}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="fixed bottom-0 w-full border-t border-white/10 bg-gray-950/90 backdrop-blur-md p-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIdx === 0 || submitting}
            className="px-6 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
          >
            Previous
          </button>
          
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-8 py-2.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium text-sm transition-colors"
            >
              Next Question
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
