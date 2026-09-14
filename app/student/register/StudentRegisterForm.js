'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [program, setProgram] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, registrationId, program, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      router.push('/student/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const EyeIcon = ({ open }) =>
    open ? (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd"/>
        <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z"/>
      </svg>
    ) : (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd"/>
      </svg>
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/>
          </svg>
          <span className="text-sm font-medium text-red-700">{error}</span>
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-1.5">
        <label htmlFor="student-name" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Full Name
        </label>
        <input
          id="student-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          placeholder="Priya Mehta"
          className="input-premium"
        />
      </div>

      {/* Registration ID */}
      <div className="space-y-1.5">
        <label htmlFor="student-registration-id" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Registration ID
        </label>
        <input
          id="student-registration-id"
          type="text"
          required
          value={registrationId}
          onChange={(e) => setRegistrationId(e.target.value)}
          disabled={loading}
          placeholder="e.g. STU-12345"
          className="input-premium"
        />
      </div>

      {/* Program */}
      <div className="space-y-1.5">
        <label htmlFor="student-program" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Course / Program
        </label>
        <input
          id="student-program"
          type="text"
          required
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          disabled={loading}
          placeholder="e.g. Computer Science"
          className="input-premium"
        />
      </div>

      {/* 2-column password row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="student-password" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Password
          </label>
          <div className="relative">
            <input
              id="student-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              className="input-premium pr-10"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="student-confirm-password" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Confirm
          </label>
          <input
            id="student-confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="input-premium"
          />
        </div>
      </div>

      {/* Password hint */}
      <p className="text-[11px] text-zinc-400 -mt-1">At least 8 characters.</p>

      {/* Submit */}
      <div className="pt-1">
        <button
          id="student-register-submit"
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="btn-press-indigo w-full rounded-xl py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </div>

      <p className="pt-2 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link
          href="/student/login"
          className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
