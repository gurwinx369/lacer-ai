import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import StudentLoginForm from './StudentLoginForm';

export const metadata = {
  title: 'Student Login — Lacer AI',
  description: 'Sign in to your Lacer AI student account',
};

export default async function StudentLoginPage() {
  // If already authenticated as a student, redirect to their dashboard.
  // (Student dashboard is not built yet — redirect to root for now.)
  const session = await getSession();
  if (session?.role === 'student') {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-white tracking-tight">
            Lacer <span className="text-indigo-400">AI</span>
          </span>
          <p className="mt-2 text-sm text-gray-400">Student Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-6">Sign in to your student account</p>
          <StudentLoginForm />
        </div>
      </div>
    </div>
  );
}
