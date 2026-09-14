import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TeacherLoginForm from './TeacherLoginForm';
import Link from 'next/link';

export const metadata = {
  title: 'Teacher Login — Lacer AI',
  description: 'Sign in to your Lacer AI teacher account',
};

export default async function TeacherLoginPage() {
  const session = await getSession();
  if (session?.role === 'teacher') {
    redirect('/teacher/dashboard');
  }

  return (
    <div className="min-h-screen flex w-full bg-white">
      
      {/* ── Left Pane: Brand & Value Prop (Hidden on mobile) ── */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle Background Pattern (Premium SaaS feel) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Decorative Glow */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-emerald-500/10 blur-[100px] rounded-full transform -translate-y-1/2"></div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-bold text-white tracking-tighter">
              Lacer <span className="text-emerald-400">AI</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold tracking-tighter text-white mb-6 leading-[1.1]">
            From Marks to <span className="text-emerald-400">Mastery.</span>
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed font-medium">
            Stop relying on generic scores. Identify precise learning gaps, recommend targeted interventions, and track concept-level mastery for every student in your classroom.
          </p>
          

        </div>
      </div>

      {/* ── Right Pane: Auth Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-[400px]">
          
          {/* Mobile-only logo */}
          <div className="lg:hidden mb-12 flex justify-center">
            <span className="text-3xl font-bold text-zinc-900 tracking-tighter">
              Lacer <span className="text-emerald-500">AI</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tighter text-zinc-900 mb-2">Welcome back</h1>
            <p className="text-base text-zinc-500 font-medium">
              Sign in to your teacher portal to continue.
            </p>
          </div>

          <TeacherLoginForm />

          <p className="mt-8 text-center text-sm font-medium text-zinc-500">
            Don't have an account?{' '}
            <Link href="/teacher/signup" className="text-emerald-600 hover:text-emerald-700 hover:underline underline-offset-4 transition-all font-bold">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
