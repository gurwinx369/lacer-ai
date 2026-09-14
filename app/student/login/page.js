import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import StudentLoginForm from './StudentLoginForm';

export const metadata = {
  title: 'Sign In — Lacer AI',
  description: 'Sign in to your Lacer AI student account and continue your learning journey.',
};

export default async function StudentLoginPage() {
  const session = await getSession();
  if (session?.role === 'student') {
    redirect('/student/dashboard');
  }

  return (
    <div className="min-h-[100dvh] flex">
      {/* ── Left panel: Brand & Social Proof ── */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col overflow-hidden bg-zinc-950">
        {/* Mesh blobs */}
        <div
          className="blob-drift pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full opacity-[0.15]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
          aria-hidden="true"
        />
        <div
          className="blob-drift-alt pointer-events-none absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        {/* Fine grain texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-12 xl:px-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-xl font-black tracking-tighter text-white">
              Lacer<span className="text-indigo-400">AI</span>
            </span>
          </div>

          {/* Main copy — asymmetric, left-aligned */}
          <div className="mt-auto mb-12">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">
              Student Portal
            </p>
            <h1 className="text-4xl xl:text-5xl font-black tracking-tighter text-white leading-[1.05]">
              Learn smarter.<br />
              <span className="text-zinc-400">Close every gap.</span>
            </h1>
            <p className="mt-5 text-base text-zinc-500 leading-relaxed max-w-[38ch]">
              AI pinpoints exactly which concepts you&apos;re missing — then builds a path back to mastery.
            </p>

            {/* Stats row */}
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/[0.06] pt-8">
              {[
                { value: '94%', label: 'concept retention' },
                { value: '3×', label: 'faster gap closure' },
                { value: '12k+', label: 'active learners' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-black tracking-tight text-white">{value}</p>
                  <p className="mt-1 text-xs text-zinc-500 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex flex-1 flex-col bg-white">
        {/* Mobile logo */}
        <div className="flex items-center px-6 pt-8 lg:hidden">
          <span className="text-lg font-black tracking-tighter text-zinc-900">
            Lacer<span className="text-indigo-500">AI</span>
          </span>
        </div>

        {/* Form container */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[380px] auth-float">
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight text-zinc-900">Welcome back</h2>
              <p className="mt-1.5 text-sm text-zinc-500">
                Sign in to continue your learning journey.
              </p>
            </div>

            <StudentLoginForm />
          </div>
        </div>

        {/* Bottom footer */}
        <p className="pb-6 text-center text-[11px] text-zinc-400">
          © {new Date().getFullYear()} Lacer AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}
