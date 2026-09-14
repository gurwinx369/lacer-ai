'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please verify your credentials.');
        return;
      }

      router.push('/teacher/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <svg className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-semibold text-rose-700 leading-snug">
            {error}
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="teacher-email" className="block text-sm font-bold text-zinc-900 mb-1.5">
            Email address
          </label>
          <input
            id="teacher-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="name@school.edu"
            className="
              w-full rounded-xl border border-zinc-300 bg-white px-4 py-3
              text-base font-semibold text-zinc-900 shadow-inner placeholder:text-zinc-400 placeholder:font-medium
              focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
              disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="teacher-password" className="block text-sm font-bold text-zinc-900">
              Password
            </label>
            <a href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
              Forgot password?
            </a>
          </div>
          <input
            id="teacher-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="
              w-full rounded-xl border border-zinc-300 bg-white px-4 py-3
              text-base font-semibold text-zinc-900 shadow-inner placeholder:text-zinc-400 placeholder:font-medium
              focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
              disabled:opacity-50 disabled:bg-zinc-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          />
        </div>
      </div>

      {/* Submit */}
      <button
        id="teacher-login-submit"
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="
          btn-press-emerald mt-6 w-full
          rounded-xl px-5 py-3.5
          text-base font-bold text-white
          disabled:opacity-60 disabled:cursor-not-allowed
        "
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Signing in...
          </span>
        ) : (
          'Sign in to your account'
        )}
      </button>
    </form>
  );
}
