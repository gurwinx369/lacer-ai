'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuizTakingPage() {
  const params = useParams();
  const router = useRouter();
  const levelOrder = params.levelOrder;
  const quizId = params.quizId;

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { serialNumber: { selectedAnswer: 0, responseTimeMs: 1200 } }
  const [questionStartTime, setQuestionStartTime] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`/api/student/course/${levelOrder}/quizzes/${quizId}`)
      .then(res => res.json())
      .then(data => {
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

  function handleSelectOption(optionIndex) {
    if (result) return;
    const q = quiz.questions[currentQuestionIdx];
    // eslint-disable-next-line react-hooks/purity
    const timeSpent = Date.now() - questionStartTime;
    const existing = answers[q.serialNumber];
    const prevTime = existing ? existing.responseTimeMs : 0;

    setAnswers(prev => ({
      ...prev,
      [q.serialNumber]: {
        selectedAnswer: optionIndex,
        responseTimeMs: prevTime + timeSpent,
      }
    }));
    // eslint-disable-next-line react-hooks/purity
    setQuestionStartTime(Date.now()); // Reset for next selection or next question
  }

  function handleNext() {
    if (currentQuestionIdx < quiz.questions.length - 1) {
      const q = quiz.questions[currentQuestionIdx];
      const timeSpent = Date.now() - questionStartTime;
      const existing = answers[q.serialNumber];
      const prevTime = existing ? existing.responseTimeMs : 0;
      
      setAnswers(prev => ({
        ...prev,
        [q.serialNumber]: {
          selectedAnswer: existing?.selectedAnswer ?? null,
          responseTimeMs: prevTime + timeSpent,
        }
      }));

      setCurrentQuestionIdx(idx => idx + 1);
      setQuestionStartTime(Date.now());
    }
  }

  function handlePrev() {
    if (currentQuestionIdx > 0) {
      const q = quiz.questions[currentQuestionIdx];
      const timeSpent = Date.now() - questionStartTime;
      const existing = answers[q.serialNumber];
      const prevTime = existing ? existing.responseTimeMs : 0;
      
      setAnswers(prev => ({
        ...prev,
        [q.serialNumber]: {
          selectedAnswer: existing?.selectedAnswer ?? null,
          responseTimeMs: prevTime + timeSpent,
        }
      }));

      setCurrentQuestionIdx(idx => idx - 1);
      setQuestionStartTime(Date.now());
    }
  }

  async function handleSubmit() {
    if (submitting) return;

    // Save time for last question
    const q = quiz.questions[currentQuestionIdx];
    const timeSpent = Date.now() - questionStartTime;
    const existing = answers[q.serialNumber];
    const prevTime = existing ? existing.responseTimeMs : 0;
    
    const finalAnswers = {
      ...answers,
      [q.serialNumber]: {
        selectedAnswer: existing?.selectedAnswer ?? null,
        responseTimeMs: prevTime + timeSpent,
      }
    };

    // Ensure all questions are in payload, even if unanswered
    const payloadAnswers = quiz.questions.map(question => ({
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
        body: JSON.stringify({
          quizId,
          answers: payloadAnswers,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Submission failed');
      }
    } catch {
      setError('Network error submitting quiz.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (error && !quiz) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white p-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 max-w-md w-full text-center">
          <p className="text-red-400">{error}</p>
          <Link href={`/student/course/${levelOrder}`} className="mt-4 inline-block text-sm text-gray-400 hover:text-white">← Back to Level</Link>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
          <p className="text-gray-400 mb-6">Your answers have been recorded.</p>
          
          <div className="flex justify-center items-center gap-4 mb-8">
            <div className="text-center">
              <span className="block text-4xl font-black text-indigo-400">{result.score}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Correct</span>
            </div>
            <div className="text-3xl font-light text-white/20">/</div>
            <div className="text-center">
              <span className="block text-4xl font-black text-white">{result.totalQuestions}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
            </div>
          </div>

          <Link
            href={`/student/course/${levelOrder}`}
            className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium"
          >
            Return to Level
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIdx];
  const currentAnswer = answers[currentQuestion.serialNumber]?.selectedAnswer;
  const isLastQuestion = currentQuestionIdx === quiz.questions.length - 1;

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
            <h1 className="font-semibold truncate max-w-[200px] sm:max-w-md">{quiz.title}</h1>
          </div>
          <div className="text-sm font-medium text-gray-400">
            {currentQuestionIdx + 1} of {quiz.questions.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/5 w-full">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentQuestionIdx + 1) / quiz.questions.length) * 100}%` }}
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
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,1)]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium shrink-0 ${
                    currentAnswer === idx
                      ? 'border-indigo-400 bg-indigo-500 text-white'
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
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-8 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
            >
              Next Question
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
