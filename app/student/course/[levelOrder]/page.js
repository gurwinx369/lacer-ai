import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { verifyAndGetStudentLevel } from '@/lib/student-course';
import QuizzesList from './QuizzesList';
import YoutubePlayer from '@/components/YoutubePlayer';
import { connectDB } from '@/lib/db';
import Assignment from '@/models/Assignment';
import AssignmentAttempt from '@/models/AssignmentAttempt';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  return { title: `Level ${resolvedParams.levelOrder} — Lacer AI` };
}

function formatTime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ── Concept Video ──────────────────────────────────────────────────────── */
function ConceptVideo({ videoSegment }) {
  if (!videoSegment) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#EDE8E1] px-4 py-3">
        <svg className="h-4 w-4 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2v-4a2 2 0 012-2z"
          />
        </svg>
        <span className="text-xs font-medium text-stone-400">No focused video configured for this concept.</span>
      </div>
    );
  }

  return (
    <div className="mt-5 pt-4 border-t border-stone-100">
      {/* Video meta row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">Focused Video</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {formatTime(videoSegment.startSeconds)} – {formatTime(videoSegment.endSeconds)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 border border-stone-200">
          <svg className="h-3 w-3 text-stone-500" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M2 2.5A.5.5 0 012.5 2l7 3.5a.5.5 0 010 .894l-7 3.5A.5.5 0 012 9.5V2.5z"/>
          </svg>
          <span className="text-[11px] font-bold text-stone-600">Watch</span>
        </div>
      </div>
      <YoutubePlayer
        videoId={videoSegment.videoId}
        startSeconds={videoSegment.startSeconds}
        endSeconds={videoSegment.endSeconds}
      />
    </div>
  );
}

/* ── Assignment Card ────────────────────────────────────────────────────── */
function AssignmentCard({ assignmentStatus, levelOrder }) {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-stone-900 leading-snug">{assignmentStatus.title}</h3>

          {assignmentStatus.state === 'LOCKED' && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Available {new Date(assignmentStatus.availableFrom).toLocaleDateString()}
            </p>
          )}
          {assignmentStatus.state === 'AVAILABLE' && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Ready to submit
            </p>
          )}
          {assignmentStatus.state === 'COMPLETED' && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
              </svg>
              {assignmentStatus.score}/{assignmentStatus.total} correct
            </p>
          )}
        </div>

        <div className="shrink-0">
          {assignmentStatus.state === 'LOCKED' && (
            <button disabled className="rounded-xl bg-stone-100 px-5 py-2.5 text-sm font-bold text-stone-400 cursor-not-allowed">
              Locked
            </button>
          )}
          {assignmentStatus.state === 'AVAILABLE' && (
            <Link
              href={`/student/course/${levelOrder}/assignment`}
              className="btn-press-indigo inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            >
              Start Assignment
            </Link>
          )}
          {assignmentStatus.state === 'COMPLETED' && (
            <Link
              href={`/student/course/${levelOrder}/assignment/results?attemptId=${assignmentStatus.attemptId}`}
              className="btn-press-ghost inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-stone-700"
            >
              View Results
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default async function StudentLevelPage({ params }) {
  const session = await getSession();
  if (!session) redirect('/student/login');
  if (session.role !== 'student') redirect('/teacher/dashboard');

  const resolvedParams = await params;
  const levelOrder = parseInt(resolvedParams.levelOrder, 10);
  if (Number.isNaN(levelOrder) || levelOrder < 1) redirect('/student/dashboard');

  const result = await verifyAndGetStudentLevel(levelOrder);
  if (result.error) redirect('/student/dashboard');

  const { level, course } = result;

  await connectDB();

  const assignment = await Assignment.findOne({ course: course.id, levelOrder }).lean();
  let assignmentStatus = { exists: false };

  if (assignment) {
    const existing = await AssignmentAttempt.findOne({
      student: session.userId,
      assignment: assignment._id,
    }).lean();

    if (existing) {
      assignmentStatus = {
        exists: true, state: 'COMPLETED',
        attemptId: existing._id.toString(),
        score: existing.score,
        total: existing.totalQuestions,
        title: assignment.title,
      };
    } else if (new Date(assignment.availableFrom) > new Date()) {
      assignmentStatus = {
        exists: true, state: 'LOCKED',
        availableFrom: assignment.availableFrom,
        title: assignment.title,
      };
    } else {
      assignmentStatus = { exists: true, state: 'AVAILABLE', title: assignment.title };
    }
  }

  const levelColors = [
    { dot: 'bg-emerald-500', label: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200', accent: '#10b981' },
    { dot: 'bg-sky-500',     label: 'text-sky-700',     badge: 'bg-sky-50 border-sky-200',         accent: '#0ea5e9' },
    { dot: 'bg-indigo-500',  label: 'text-indigo-700',  badge: 'bg-indigo-50 border-indigo-200',   accent: '#6366f1' },
    { dot: 'bg-rose-500',    label: 'text-rose-700',    badge: 'bg-rose-50 border-rose-200',       accent: '#f43f5e' },
    { dot: 'bg-amber-500',   label: 'text-amber-700',   badge: 'bg-amber-50 border-amber-200',     accent: '#f59e0b' },
  ];
  const lc = levelColors[(levelOrder - 1) % levelColors.length];

  return (
    /* 70% warm cream — from CSS var(--background) via globals.css */
    <div className="min-h-screen" style={{ background: '#F2EDE6' }}>

      {/* ── Sticky Header — 30% white surface ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/[0.06] shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center gap-4">
          <Link
            href="/student/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors active:scale-95"
            aria-label="Back to dashboard"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${lc.dot}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400 leading-none">Level {level.levelOrder}</p>
              <p className="text-sm font-bold text-stone-900 truncate max-w-[240px] sm:max-w-sm mt-0.5">{level.title}</p>
            </div>
          </div>

          {/* LacerAI wordmark — right */}
          <div className="ml-auto">
            <span className="text-base font-black tracking-tighter text-stone-900">
              Lacer<span className="text-indigo-500">AI</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24 space-y-8">

        {/* ── Level Hero — sits on the warm cream base (70%) ── */}
        <section className="stagger-item" style={{ animationDelay: '0ms' }}>
          {/* Level label badge */}
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-5 ${lc.badge} ${lc.label}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${lc.dot}`} />
            Level {level.levelOrder}
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-stone-900 leading-tight">
            {level.title}
          </h1>
          {level.description && (
            <p className="mt-3 text-base text-stone-500 leading-relaxed max-w-[60ch] font-medium">
              {level.description}
            </p>
          )}
        </section>

        {/* ── Concepts — white cards (30%) on warm base (70%) ── */}
        <section className="stagger-item" style={{ animationDelay: '60ms' }}>
          {/* Section label */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-black/[0.06]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Concepts to Learn</span>
            <div className="h-px flex-1 bg-black/[0.06]" />
          </div>

          <div className="grid gap-4">
            {level.concepts.map((concept, i) => (
              <div
                key={concept.conceptOrder}
                className="rounded-2xl bg-white border border-stone-200/60 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 stagger-item"
                style={{ animationDelay: `${80 + i * 60}ms` }}
              >
                {/* Concept header */}
                <div className="flex gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-black text-stone-600">
                    {concept.conceptOrder}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-stone-900 leading-snug">{concept.title}</h3>
                    {concept.description && (
                      <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{concept.description}</p>
                    )}
                  </div>
                </div>

                {/* Video */}
                <ConceptVideo videoSegment={concept.videoSegment} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Quizzes ── */}
        <section className="stagger-item" style={{ animationDelay: '160ms' }}>
          <QuizzesList levelOrder={level.levelOrder} />
        </section>

        {/* ── Assignment ── */}
        {assignmentStatus.exists && (
          <section className="stagger-item" style={{ animationDelay: '220ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-black/[0.06]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Level Assignment</span>
              <div className="h-px flex-1 bg-black/[0.06]" />
            </div>
            <AssignmentCard assignmentStatus={assignmentStatus} levelOrder={levelOrder} />
          </section>
        )}
      </main>
    </div>
  );
}