'use client';

import Link from 'next/link';

/* The offset pattern creates the Duolingo-style winding S-path.
   Values are in px relative to the flex-center baseline.
   These MUST match the visual positions — the SVG spine in DashboardClient
   reads actual DOM positions via data-node-circle, so any offset value works. */
const OFFSETS = [0, 64, 100, 64, 0, -64, -100, -64];

const COLORS = [
  { bg: 'bg-emerald-500', border: 'border-emerald-700', text: 'text-white', accent: 'text-emerald-600' },
  { bg: 'bg-sky-500',     border: 'border-sky-700',     text: 'text-white', accent: 'text-sky-600'     },
  { bg: 'bg-indigo-500',  border: 'border-indigo-700',  text: 'text-white', accent: 'text-indigo-600'  },
  { bg: 'bg-rose-500',    border: 'border-rose-700',    text: 'text-white', accent: 'text-rose-600'    },
  { bg: 'bg-amber-500',   border: 'border-amber-700',   text: 'text-white', accent: 'text-amber-600'   },
];

export default function RoadmapLevel({ level, index }) {
  const { unlocked, levelOrder, title, concepts } = level;

  const offset = OFFSETS[(index ?? 0) % OFFSETS.length];
  const color  = COLORS[(levelOrder - 1) % COLORS.length];

  /* ── Locked node ── */
  if (!unlocked) {
    return (
      <div
        className="stagger-item w-full flex justify-center py-8"
        style={{ animationDelay: `${(index ?? 0) * 80}ms` }}
      >
        <div
          className="flex flex-col items-center gap-3"
          style={{ transform: `translateX(${offset}px)` }}
        >
          {/* Circle — tagged for SVG spine measurement */}
          <div
            data-node-circle
            className="w-20 h-20 rounded-full bg-zinc-200 border-b-4 border-zinc-300 flex items-center justify-center shadow-sm relative z-10"
          >
            <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Label card */}
          <div className="bg-white/80 rounded-2xl px-4 py-3 shadow-sm border border-zinc-200/80 text-center max-w-[180px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Level {levelOrder}</p>
            <h3 className="text-sm font-semibold text-zinc-500 leading-tight mt-0.5">{title}</h3>
          </div>
        </div>
      </div>
    );
  }

  /* ── Unlocked node ── */
  return (
    <div
      className="stagger-item w-full flex justify-center py-8"
      style={{ animationDelay: `${(index ?? 0) * 80}ms` }}
    >
      <div
        className="flex flex-col items-center gap-3 relative z-10"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {/* Circle — tagged for SVG spine measurement */}
        <Link
          href={`/student/course/${levelOrder}`}
          className="block outline-none group"
          aria-label={`Enter Level ${levelOrder}: ${title}`}
        >
          <div
            data-node-circle
            className={[
              'w-24 h-24 rounded-full relative flex items-center justify-center shadow-lg',
              color.bg,
              'border-b-[6px]',
              color.border,
              'transition-transform duration-150',
              'active:translate-y-1.5 active:border-b-0 active:mt-[6px]',
              'group-hover:scale-105',
              'group-focus-visible:ring-4 ring-indigo-400 ring-offset-4 ring-offset-slate-50',
            ].join(' ')}
          >
            {/* Star icon */}
            <svg className={`w-10 h-10 ${color.text} drop-shadow-sm`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            {/* Inner gloss ring */}
            <div className="absolute inset-2 rounded-full border-2 border-white/25 pointer-events-none" />
          </div>
        </Link>

        {/* Info card */}
        <div className="bg-white rounded-[1.25rem] px-5 py-4 shadow-[0_8px_28px_rgba(0,0,0,0.07)] border border-black/[0.05] text-center w-60 md:w-68">
          <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${color.accent}`}>
            Level {levelOrder}
          </p>
          <h3 className="text-sm font-bold text-zinc-900 leading-snug">{title}</h3>

          {concepts && concepts.length > 0 && (
            <div className="mt-2.5 flex flex-wrap justify-center gap-1">
              {concepts.slice(0, 2).map((concept) => (
                <span
                  key={concept.conceptOrder}
                  className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600"
                >
                  {concept.title}
                </span>
              ))}
              {concepts.length > 2 && (
                <span className="inline-block rounded-full bg-zinc-50 border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                  +{concepts.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
