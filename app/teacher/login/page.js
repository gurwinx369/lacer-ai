import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TeacherLoginForm from './TeacherLoginForm';

export const metadata = {
  title: 'Teacher Login — Lacer AI',
  description: 'Sign in to your Lacer AI teacher account',
};

export default async function TeacherLoginPage() {
  // If already authenticated as a teacher, skip the login page.
  const session = await getSession();
  if (session?.role === 'teacher') {
    redirect('/teacher/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-white tracking-tight">
            Lacer <span className="text-indigo-400">AI</span>
          </span>
          <p className="mt-2 text-sm text-gray-400">Teacher Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-6">Sign in to your teacher account</p>
          <TeacherLoginForm />
        </div>
      </div>
    </div>
  );
}
