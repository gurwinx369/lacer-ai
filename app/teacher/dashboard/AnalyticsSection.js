'use client';

import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────
   Big stat card — Duolingo-style with a coloured bottom bar accent (Light Theme)
───────────────────────────────────────────────────────────────────────── */
function StatCard({ label, value, tone = 'default', delay = 0 }) {
  const tones = {
    default: { num: '#18181b', bar: '#9ca3af', ring: 'border-black/[0.04]' },
    success: { num: '#059669', bar: '#10b981', ring: 'border-black/[0.04]' },
    warning: { num: '#b45309', bar: '#f59e0b', ring: 'border-black/[0.04]' },
    danger:  { num: '#e11d48', bar: '#f43f5e', ring: 'border-black/[0.04]' },
    muted:   { num: '#71717a', bar: '#e4e4e7', ring: 'border-black/[0.04]' },
  };
  const t = tones[tone] ?? tones.default;

  return (
    <div
      className={`stagger-item relative overflow-hidden rounded-2xl border ${t.ring} bg-white px-5 pb-5 pt-4 shadow-sm transition-shadow hover:shadow-md`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Bottom accent bar — Duolingo reference */}
      <div
        className="absolute inset-x-0 bottom-0 h-1.5 rounded-b-2xl"
        style={{ background: t.bar }}
        aria-hidden="true"
      />
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p
        className="mt-2 text-4xl font-black tracking-tight"
        style={{ color: t.num }}
      >
        {value}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Status badge
───────────────────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    AT_RISK:     { label: 'At Risk',     cls: 'border-rose-200 bg-rose-50 text-rose-700'         },
    LAGGING:     { label: 'Lagging',     cls: 'border-amber-200 bg-amber-50 text-amber-700'      },
    GOOD:        { label: 'Good',        cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    NO_ACTIVITY: { label: 'No Activity', cls: 'border-zinc-200 bg-zinc-50 text-zinc-600'           },
  };
  const { label, cls } = cfg[status] ?? cfg.NO_ACTIVITY;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Concept chip (Duolingo quiz-chip style — 3D press shadow, Light Theme)
───────────────────────────────────────────────────────────────────────── */
function ConceptChip({ label }) {
  return (
    <span className="chip-press rounded-lg px-2.5 py-1 text-[11px] font-bold">
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Student row (desktop table)
───────────────────────────────────────────────────────────────────────── */
function StudentRow({ student }) {
  const attentionCount = student.attentionConcepts?.length ?? 0;

  return (
    <tr className="group border-b border-zinc-100 transition-colors hover:bg-zinc-50">
      <td className="px-6 py-4">
        <Link href={`/teacher/dashboard/student/${student.studentId}`} className="block">
          <div className="font-bold text-zinc-900 transition-colors group-hover:text-emerald-600">
            {student.name || 'Unnamed Student'}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
            {student.registrationId || '—'}
          </div>
        </Link>
      </td>

      <td className="px-6 py-4">
        <StatusBadge status={student.status} />
      </td>

      <td className="px-6 py-4">
        {attentionCount === 0 ? (
          <span className="text-sm text-zinc-400">—</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {student.attentionConcepts.slice(0, 3).map((c) => (
              <ConceptChip
                key={`${c.conceptOrder}-${c.concept}`}
                label={c.concept}
              />
            ))}
            {attentionCount > 3 && (
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-500">
                +{attentionCount - 3}
              </span>
            )}
          </div>
        )}
      </td>

      <td className="px-6 py-4 text-right">
        <Link
          href={`/teacher/dashboard/student/${student.studentId}`}
          className="btn-press-ghost inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
        >
          View
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Student card (mobile)
───────────────────────────────────────────────────────────────────────── */
function StudentCard({ student }) {
  const attentionCount = student.attentionConcepts?.length ?? 0;

  return (
    <Link
      href={`/teacher/dashboard/student/${student.studentId}`}
      className="block border-b border-zinc-100 p-5 transition-colors hover:bg-zinc-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold text-zinc-900">
            {student.name || 'Unnamed Student'}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
            {student.registrationId || '—'}
          </div>
        </div>
        <StatusBadge status={student.status} />
      </div>

      {attentionCount > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Needs attention
          </p>
          <div className="flex flex-wrap gap-2">
            {student.attentionConcepts.slice(0, 4).map((c) => (
              <ConceptChip
                key={`${c.conceptOrder}-${c.concept}`}
                label={c.concept}
              />
            ))}
            {attentionCount > 4 && (
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-500">
                +{attentionCount - 4}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500 font-medium">
          {attentionCount} {attentionCount === 1 ? 'concept' : 'concepts'} flagged
        </span>
        <span className="font-bold text-emerald-600">View profile →</span>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Concept gap row — with a visual heat bar
───────────────────────────────────────────────────────────────────────── */
function ConceptGapRow({ concept, maxAttention, delay = 0 }) {
  const attention = concept.studentsNeedingAttention ?? 0;
  const knowledgeGap = concept.studentsWithKnowledgeGap ?? 0;
  const hasData = concept.hasAssessmentData;

  /* Heat bar width: 0–100% relative to the worst concept on screen */
  const pct = maxAttention > 0 ? Math.round((attention / maxAttention) * 100) : 0;

  /* Colour transitions: low → amber, high → rose */
  const barColor = pct >= 70 ? '#f43f5e' : pct >= 35 ? '#f59e0b' : '#9ca3af';

  return (
    <div
      className="stagger-item flex flex-col gap-4 border-b border-zinc-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between last:border-b-0 hover:bg-zinc-50 transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="shrink-0 font-mono text-[10px] text-zinc-400">
            #{String(concept.conceptOrder).padStart(2, '0')}
          </span>
          <h3 className="truncate text-sm font-bold text-zinc-900">
            {concept.concept}
          </h3>
        </div>

        {/* Heat bar */}
        {hasData && (
          <div className="mt-2.5 pl-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-1.5 rounded-full transition-all duration-700 ease-out-expo"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
          </div>
        )}

        <div className="mt-2 pl-8 text-[11px] font-medium text-zinc-500">
          {hasData
            ? `${attention} ${attention === 1 ? 'student' : 'students'} needing attention`
            : 'No assessment data yet'}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 pl-8 sm:pl-0">
        <MetricPill label="Gaps" value={knowledgeGap} highlight={knowledgeGap > 0} />
        <MetricPill label="Attention" value={attention} highlight={attention > 0} />
      </div>
    </div>
  );
}

function MetricPill({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border px-3.5 py-2 text-center ${
      highlight
        ? 'border-rose-200 bg-rose-50'
        : 'border-zinc-200 bg-zinc-50'
    }`}>
      <div className={`text-[9px] font-bold uppercase tracking-widest ${highlight ? 'text-rose-400' : 'text-zinc-400'}`}>{label}</div>
      <div className={`mt-0.5 text-sm font-black ${highlight ? 'text-rose-700' : 'text-zinc-700'}`}>
        {value}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Empty states
───────────────────────────────────────────────────────────────────────── */
function EmptyAttentionState() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center bg-zinc-50/50">
      {/* SVG checkmark circle — no emoji */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12l5 5L20 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <h3 className="text-base font-bold text-zinc-900">All students on track</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
          No knowledge gaps or disengaged-guessing signals detected right now.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main analytics section
───────────────────────────────────────────────────────────────────────── */
export default function AnalyticsSection({ analytics }) {
  if (!analytics) return null;

  const {
    summary = {},
    conceptGaps = [],
    studentsNeedingAttention = [],
  } = analytics;

  const maxAttention = Math.max(
    0,
    ...conceptGaps.map((c) => c.studentsNeedingAttention ?? 0)
  );

  return (
    <div className="space-y-10">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Students"    value={summary.totalStudents ?? 0}    tone="default" delay={0}   />
        <StatCard label="Good"        value={summary.goodStudents ?? 0}      tone="success" delay={60}  />
        <StatCard label="Lagging"     value={summary.laggingStudents ?? 0}   tone="warning" delay={120} />
        <StatCard label="At Risk"     value={summary.atRiskStudents ?? 0}    tone="danger"  delay={180} />
        <StatCard label="No Activity" value={summary.noActivityStudents ?? 0} tone="muted"  delay={240} />
      </div>

      {/* ── Students needing attention ── */}
      <section className="overflow-hidden rounded-[2.5rem] border border-black/[0.04] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">Students Needing Attention</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Students with concepts that may require additional support.
            </p>
          </div>
          {studentsNeedingAttention.length > 0 && (
            <span className="shrink-0 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700">
              {studentsNeedingAttention.length}{' '}
              {studentsNeedingAttention.length === 1 ? 'student' : 'students'}
            </span>
          )}
        </div>

        {studentsNeedingAttention.length === 0 ? (
          <EmptyAttentionState />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    {['Student', 'Status', 'Concepts', 'Action'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 ${
                          i === 3 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentsNeedingAttention.map((student) => (
                    <StudentRow key={student.studentId} student={student} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden">
              {studentsNeedingAttention.map((student) => (
                <StudentCard key={student.studentId} student={student} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Concept gaps ── */}
      <section className="overflow-hidden rounded-[2.5rem] border border-black/[0.04] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="border-b border-zinc-100 px-6 py-6 sm:px-8">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">Concept Gaps</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Concepts where students are most frequently struggling.
          </p>
        </div>

        {conceptGaps.length === 0 ? (
          <div className="px-6 py-16 text-center bg-zinc-50/50">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm">
              <svg width="24" height="24" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="7.5" stroke="#a1a1aa" strokeWidth="1.5"/>
                <path d="M9 5.5v4M9 11.5v1" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500">No concept-level assessment data yet.</p>
          </div>
        ) : (
          <div>
            {conceptGaps.map((concept, idx) => (
              <ConceptGapRow
                key={`${concept.conceptOrder}-${concept.concept}`}
                concept={concept}
                maxAttention={maxAttention}
                delay={idx * 40}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}