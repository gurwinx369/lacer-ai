'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ─────────────────────────── Verdict helpers ──────────────────────────────
const VERDICT_CONFIG = {
  MASTERY: {
    label: 'Strong',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-500',
  },
  DEVELOPING: {
    label: 'Good',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
    bar: 'bg-sky-500',
  },
  KNOWLEDGE_GAP: {
    label: 'Gap',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-400',
    bar: 'bg-red-500',
  },
  DISENGAGED_GUESSING: {
    label: 'Guessing',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    bar: 'bg-amber-500',
  },
  INSUFFICIENT_DATA: {
    label: 'New',
    bg: 'bg-gray-500/15',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    dot: 'bg-gray-500',
    bar: 'bg-gray-600',
  },
};

function verdictCfg(verdict) {
  return VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.INSUFFICIENT_DATA;
}

// ─────────────────────────── XP Bar ──────────────────────────────────────
function XPBar({ xp }) {
  const xpPerLevel = 500;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const progress = ((xp % xpPerLevel) / xpPerLevel) * 100;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs font-bold text-indigo-400 shrink-0">Lv {level}</span>
      <div className="relative flex-1 h-2 bg-white/10 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 shrink-0">{xp} XP</span>
    </div>
  );
}

// ─────────────────────────── Streak Badge ────────────────────────────────
function StreakBadge({ streak }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold transition-all ${
        streak > 0
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          : 'bg-white/5 border-white/10 text-gray-500'
      }`}
    >
      <span className="text-base leading-none">🔥</span>
      <span>{streak}</span>
    </div>
  );
}

// ─────────────────────────── Today's Homework Banner ─────────────────────
function HomeworkBanner({ homework }) {
  if (!homework) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5">
      {/* glow */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📝</span>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
              Today&apos;s Homework
            </span>
          </div>
          <p className="text-base font-bold text-white truncate">{homework.conceptName}</p>
          <p className="mt-0.5 text-xs text-gray-400">{homework.levelTitle}</p>
        </div>
        {homework.quizId ? (
          <a
            href={`/student/quiz/${homework.quizId}?courseId=${homework.courseId}`}
            id="homework-start-btn"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-amber-500/20"
          >
            Start Quiz →
          </a>
        ) : (
          <span className="shrink-0 text-xs text-gray-500 pt-1">Quiz coming soon</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Mastery Snapshot ────────────────────────────
function MasterySnapshot({ snapshot }) {
  if (!snapshot.length) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        Concept Mastery
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {snapshot.map(({ concept, verdict, posterior }) => {
          const cfg = verdictCfg(verdict);
          const pct = posterior != null ? Math.round(posterior * 100) : null;
          return (
            <div
              key={concept}
              className={`flex items-center gap-3 rounded-xl border p-3.5 ${cfg.bg} ${cfg.border}`}
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{concept}</p>
                <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${cfg.text}`}>
                {pct != null ? `${pct}%` : cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────── Concept Node ────────────────────────────────
function ConceptNode({ concept, isLast, courseId }) {
  const [open, setOpen] = useState(false);
  const { name, isUnlocked, taughtAt, verdict } = concept;
  const cfg = verdictCfg(verdict);

  // Node visual state
  const nodeStyle = isUnlocked
    ? verdict === 'MASTERY'
      ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-100'
      : 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-500/40 animate-pulse-slow'
    : 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed';

  const iconEmoji = !isUnlocked ? '🔒' : verdict === 'MASTERY' ? '✓' : '▶';

  return (
    <div className="flex gap-4">
      {/* Path + node column */}
      <div className="flex flex-col items-center">
        <button
          disabled={!isUnlocked}
          onClick={() => isUnlocked && setOpen((o) => !o)}
          className={`relative h-12 w-12 rounded-2xl border-2 flex items-center justify-center text-lg font-bold text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${nodeStyle}`}
          aria-expanded={open}
          aria-label={name}
        >
          <span className="leading-none">{iconEmoji}</span>
          {/* Ripple ring on active */}
          {isUnlocked && verdict !== 'MASTERY' && (
            <span className="absolute inset-0 rounded-2xl border-2 border-indigo-400 animate-ping opacity-30" />
          )}
        </button>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-[24px] mt-1 ${
              isUnlocked ? 'bg-indigo-500/40' : 'bg-gray-700/60'
            }`}
          />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 pb-6 min-w-0">
        <button
          disabled={!isUnlocked}
          onClick={() => isUnlocked && setOpen((o) => !o)}
          className="text-left w-full group"
        >
          <p
            className={`text-sm font-semibold leading-tight transition-colors ${
              isUnlocked
                ? 'text-white group-hover:text-indigo-300'
                : 'text-gray-600'
            }`}
          >
            {name}
          </p>
          {taughtAt && (
            <p className="mt-0.5 text-xs text-gray-500">
              Taught {new Date(taughtAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          )}
          {isUnlocked && verdict && verdict !== 'INSUFFICIENT_DATA' && (
            <span className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${cfg.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          )}
        </button>

        {/* Expanded card */}
        {open && isUnlocked && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 animate-slide-down">
            <p className="text-xs text-gray-400 leading-relaxed">
              Practice this concept to strengthen your mastery. Your answers are
              tracked per concept so Lacer AI can detect any gaps.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/student/quiz?concept=${encodeURIComponent(name)}&courseId=${courseId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 active:scale-[0.97] transition-all duration-150"
              >
                Practice Quiz →
              </a>
              <a
                href={`/student/video?concept=${encodeURIComponent(name)}&courseId=${courseId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:border-white/20 transition-all duration-150"
              >
                📺 Watch Video
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Level Section ───────────────────────────────
function LevelSection({ level, courseId }) {
  const { levelNumber, title, isUnlocked, concepts } = level;
  const allMastered = concepts.every((c) => c.verdict === 'MASTERY');
  const completedCount = concepts.filter((c) => c.verdict === 'MASTERY').length;

  return (
    <div className="relative">
      {/* Level header */}
      <div
        className={`flex items-center gap-3 mb-4 rounded-2xl px-4 py-3 border ${
          isUnlocked
            ? allMastered
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-indigo-500/10 border-indigo-500/20'
            : 'bg-white/3 border-white/8 opacity-60'
        }`}
      >
        <div
          className={`h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold ${
            isUnlocked
              ? allMastered
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-500'
          }`}
        >
          {levelNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-bold ${
              isUnlocked ? 'text-white' : 'text-gray-600'
            }`}
          >
            {title}
          </p>
          <p className="text-xs text-gray-500">
            {isUnlocked
              ? `${completedCount} / ${concepts.length} mastered`
              : 'Locked — teacher hasn\'t taught this yet'}
          </p>
        </div>
        {allMastered && isUnlocked && (
          <span className="shrink-0 text-emerald-400 text-lg">🏆</span>
        )}
        {!isUnlocked && (
          <span className="shrink-0 text-gray-600 text-lg">🔒</span>
        )}
      </div>

      {/* Concepts */}
      {isUnlocked && (
        <div className="pl-2">
          {concepts.map((concept, idx) => (
            <ConceptNode
              key={concept.name}
              concept={concept}
              isLast={idx === concepts.length - 1}
              courseId={courseId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Empty States ────────────────────────────────
function NoCourseEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="h-20 w-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-4xl mb-6">
        🎓
      </div>
      <h2 className="text-lg font-bold text-white mb-2">Roadmap Loading…</h2>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
        Your teacher is still setting up the DSA course. Once they confirm the
        learning structure, your roadmap will appear here.
      </p>
    </div>
  );
}

function NoConceptsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-5xl mb-4">⏳</div>
      <h2 className="text-base font-bold text-white mb-2">Nothing unlocked yet</h2>
      <p className="text-sm text-gray-400 max-w-xs">
        Concepts unlock as your teacher marks lessons complete in class.
        Check back after your next class!
      </p>
    </div>
  );
}

// ─────────────────────────── Main Shell ──────────────────────────────────
export default function StudentDashboardShell({
  studentName,
  xp,
  streak,
  todayHomework,
  masterySnapshot,
  levels,
  courseReady,
  courseId,
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/student/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const unlockedLevels = levels.filter((l) => l.isUnlocked);

  return (
    <>
      {/* Inline CSS for custom animations not available in Tailwind v4 keyframes yet */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-pulse-slow { animation: pulse-slow 2.5s ease-in-out infinite; }
        .animate-slide-down  { animation: slide-down 0.2s ease-out forwards; }
        .bg-white\\/3  { background-color: rgba(255,255,255,0.03); }
        .border-white\\/8 { border-color: rgba(255,255,255,0.08); }
      `}</style>

      <div className="min-h-screen bg-gray-950 text-white">
        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-20 border-b border-white/8 bg-gray-950/90 backdrop-blur-md">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <span className="text-base font-black tracking-tight shrink-0">
              Lacer <span className="text-indigo-400">AI</span>
            </span>

            {/* XP bar — center */}
            <div className="flex-1 max-w-xs hidden sm:block">
              <XPBar xp={xp} />
            </div>

            <div className="flex items-center gap-3">
              <StreakBadge streak={streak} />
              <button
                id="student-logout-btn"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-xs text-gray-500 hover:text-white disabled:opacity-50 transition-colors"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
          {/* Mobile XP bar */}
          <div className="sm:hidden px-4 pb-3">
            <XPBar xp={xp} />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-8 pb-24">
          {/* ── Greeting ── */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-black text-white">
              Hey, {studentName.split(' ')[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {streak > 0
                ? `${streak}-day streak — keep it going!`
                : 'Start a quiz to build your streak.'}
            </p>
          </div>

          {/* ── Today's Homework ── */}
          <HomeworkBanner homework={todayHomework} />

          {/* ── Mastery Snapshot ── */}
          <MasterySnapshot snapshot={masterySnapshot} />

          {/* ── Learning Roadmap ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Learning Roadmap
              </h2>
              {courseReady && levels.length > 0 && (
                <span className="text-xs text-gray-600">
                  {unlockedLevels.length}/{levels.length} levels unlocked
                </span>
              )}
            </div>

            {!courseReady ? (
              <NoCourseEmpty />
            ) : levels.length === 0 ? (
              <NoCourseEmpty />
            ) : unlockedLevels.length === 0 ? (
              <NoConceptsEmpty />
            ) : (
              <div className="space-y-6">
                {levels.map((level) => (
                  <LevelSection
                    key={level.levelNumber}
                    level={level}
                    courseId={courseId}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        {/* ── Bottom Nav Bar (mobile) ── */}
        <nav className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-gray-950/95 backdrop-blur-md sm:hidden z-20">
          <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
            {[
              { emoji: '🗺️', label: 'Roadmap', href: '/student/dashboard' },
              { emoji: '🧩', label: 'Practice', href: `/student/quiz?courseId=${courseId ?? ''}` },
              { emoji: '📊', label: 'Progress', href: '/student/progress' },
            ].map(({ emoji, label, href }) => (
              <a
                key={label}
                href={href}
                className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors"
              >
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-[10px] font-medium">{label}</span>
              </a>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
