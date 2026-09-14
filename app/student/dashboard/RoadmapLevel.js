'use client';

import Link from 'next/link';

export default function RoadmapLevel({ level }) {
  const { unlocked, levelOrder, title, description, concepts } = level;

  if (!unlocked) {
    return (
      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group opacity-60">
        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-gray-950 bg-gray-800 text-gray-400 shadow shrink-0 md:order-1 md:group-odd:-ml-5 md:group-even:-mr-5 z-10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] rounded-xl border border-white/5 bg-white/[0.02] p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Level {levelOrder}
            </span>
            <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Complete the previous level to unlock.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-gray-950 bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 shrink-0 md:order-1 md:group-odd:-ml-5 md:group-even:-mr-5 z-10 ring-2 ring-indigo-500/20 ring-offset-2 ring-offset-gray-950">
        <span className="text-sm font-bold">{levelOrder}</span>
      </div>
      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 shadow-sm hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all duration-200 group-hover:-translate-y-0.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Level {levelOrder}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{description}</p>
          )}
          
          <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
            {concepts.slice(0, 3).map((concept) => (
              <div key={concept.conceptOrder} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0"></div>
                <span className="truncate">{concept.title}</span>
              </div>
            ))}
            {concepts.length > 3 && (
              <div className="text-xs text-gray-500 italic">
                + {concepts.length - 3} more concepts
              </div>
            )}
          </div>
          
          <div className="mt-5">
            <Link
              href={`/student/course/${levelOrder}`}
              className="inline-flex items-center justify-center w-full gap-2 rounded-lg bg-indigo-600/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-600/20 hover:text-indigo-200 transition-colors"
            >
              Enter Level
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
