import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import StudentRegisterForm from './StudentRegisterForm';

export const metadata = {
  title: 'Create Account — Lacer AI',
  description: 'Create your Lacer AI student account and start closing your learning gaps.',
};

export default async function StudentRegisterPage() {
  const session = await getSession();
  if (session?.role === 'student') {
    redirect('/student/dashboard');
  }

  return (
    <div className="min-h-[100dvh] flex">
      {/* ── Left panel: Brand identity ── */}
      <div className="relative hidden lg:flex lg:w-[48%] xl:w-[50%] flex-col overflow-hidden bg-zinc-950">
        {/* Mesh blobs */}
        <div
          className="blob-drift pointer-events-none absolute -top-24 -right-24 h-[440px] w-[440px] rounded-full opacity-[0.14]"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }}
          aria-hidden="true"
        />
        <div
          className="blob-drift-alt pointer-events-none absolute -bottom-32 -left-16 h-[400px] w-[400px] rounded-full opacity-[0.10]"
          style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        {/* Grain */}
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

          {/* Copy */}
          <div className="mt-auto mb-12">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">
              Join today
            </p>
            <h1 className="text-4xl xl:text-5xl font-black tracking-tighter text-white leading-[1.05]">
              Your journey<br />
              <span className="text-zinc-400">starts here.</span>
            </h1>
            <p className="mt-5 text-base text-zinc-500 leading-relaxed max-w-[38ch]">
              Get a personalized learning roadmap built around your actual knowledge gaps — not a generic syllabus.
            </p>

            {/* Feature list */}
            <ul className="mt-10 space-y-4 border-t border-white/[0.06] pt-8">
              {[
                'AI-detected concept gaps after every quiz',
                'Targeted video segments, not full rewatches',
                'Teacher-guided unlock system for structured progress',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
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

        {/* Scrollable form area */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[400px] auth-float">
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight text-zinc-900">Create your account</h2>
              <p className="mt-1.5 text-sm text-zinc-500">
                Fill in your details to get started.
              </p>
            </div>

            <StudentRegisterForm />
          </div>
        </div>

        <p className="pb-6 text-center text-[11px] text-zinc-400">
          © {new Date().getFullYear()} Lacer AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}
