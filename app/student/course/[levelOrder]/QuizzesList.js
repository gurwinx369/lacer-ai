'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function QuizzesList({ levelOrder }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/student/course/${levelOrder}/quizzes`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setQuizzes(data.quizzes || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Network error loading quizzes.');
        setLoading(false);
      });
  }, [levelOrder]);

  if (loading) {
    return (
      <div className="mt-12 p-8 text-center text-sm text-gray-400">
        Loading quizzes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-12 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="mt-12 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
        <h3 className="text-lg font-medium text-white mb-2">No quizzes yet</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Quizzes have not been generated for this level yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Assessment Quizzes
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {quizzes.map((quiz) => (
          <Link
            key={quiz._id || quiz.serialNumber}
            href={`/student/course/${levelOrder}/quizzes/${quiz._id}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-sm shrink-0">
                {quiz.serialNumber}
              </div>
              <div>
                <h3 className="font-medium text-white">{quiz.title}</h3>
                <p className="text-xs text-gray-400 mt-1">Take Quiz →</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
