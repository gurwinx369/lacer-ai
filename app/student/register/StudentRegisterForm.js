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

      // Redirect to the student dashboard
      router.push('/student/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="student-name" className="block text-sm font-medium text-gray-300 mb-1.5">
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
          placeholder="Jane Doe"
          className="
            w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
            text-sm text-white placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
      </div>

      <div>
        <label htmlFor="student-registration-id" className="block text-sm font-medium text-gray-300 mb-1.5">
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
          className="
            w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
            text-sm text-white placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
      </div>

      <div>
        <label htmlFor="student-program" className="block text-sm font-medium text-gray-300 mb-1.5">
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
          className="
            w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
            text-sm text-white placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
      </div>

      <div>
        <label htmlFor="student-password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Password
        </label>
        <input
          id="student-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          className="
            w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
            text-sm text-white placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
      </div>

      <div>
        <label htmlFor="student-confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Confirm Password
        </label>
        <input
          id="student-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          className="
            w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
            text-sm text-white placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
      </div>

      <button
        id="student-register-submit"
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="
          w-full flex items-center justify-center gap-2
          rounded-lg bg-indigo-600 px-4 py-2.5
          text-sm font-medium text-white
          hover:bg-indigo-500 active:scale-[0.98]
          disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950
          mt-2
        "
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
            Creating account…
          </>
        ) : (
          'Create account'
        )}
      </button>

      <p className="text-center text-sm text-gray-400 mt-6">
        Already have an account?{' '}
        <Link href="/student/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  );
}
