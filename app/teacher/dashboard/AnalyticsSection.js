'use client';

import Link from 'next/link';

export default function AnalyticsSection({ analytics }) {
  if (!analytics) return null;

  const {
    summary = {},
    conceptGaps = [],
    studentsNeedingAttention = [],
  } = analytics;

  return (
    <div className="mt-8 space-y-8">
      {/* Overview */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Class Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            A quick view of student activity and learning health.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="Students"
            value={summary.totalStudents ?? 0}
          />

          <StatCard
            label="Good"
            value={summary.goodStudents ?? 0}
            tone="success"
          />

          <StatCard
            label="Lagging"
            value={summary.laggingStudents ?? 0}
            tone="warning"
          />

          <StatCard
            label="At Risk"
            value={summary.atRiskStudents ?? 0}
            tone="danger"
          />

          <StatCard
            label="No Activity"
            value={summary.noActivityStudents ?? 0}
            tone="muted"
          />
        </div>
      </section>

      {/* Students needing attention */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Students Needing Attention
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Students with concepts that may require additional support.
            </p>
          </div>

          {studentsNeedingAttention.length > 0 && (
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-gray-400">
              {studentsNeedingAttention.length}{' '}
              {studentsNeedingAttention.length === 1
                ? 'student'
                : 'students'}
            </div>
          )}
        </div>

        {studentsNeedingAttention.length === 0 ? (
          <EmptyAttentionState />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Student
                    </th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Concepts
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {studentsNeedingAttention.map((student) => (
                    <StudentRow
                      key={student.studentId}
                      student={student}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-white/5 md:hidden">
              {studentsNeedingAttention.map((student) => (
                <StudentCard
                  key={student.studentId}
                  student={student}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Concept gaps */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-white">
            Concept Gaps
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Concepts where students are most frequently struggling.
          </p>
        </div>

        {conceptGaps.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            No concept-level assessment data yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {conceptGaps.map((concept) => (
              <ConceptGapRow
                key={`${concept.conceptOrder}-${concept.concept}`}
                concept={concept}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Student row                                                                */
/* -------------------------------------------------------------------------- */

function StudentRow({ student }) {
  const isAtRisk = student.status === 'AT_RISK';
  const attentionCount = student.attentionConcepts?.length ?? 0;

  return (
    <tr className="group transition-colors hover:bg-white/[0.025]">
      <td className="px-6 py-4">
        <Link
          href={`/teacher/dashboard/student/${student.studentId}`}
          className="block"
        >
          <div className="font-medium text-white transition-colors group-hover:text-indigo-300">
            {student.name || 'Unnamed Student'}
          </div>

          <div className="mt-0.5 text-xs text-gray-500">
            {student.registrationId || 'No registration ID'}
          </div>
        </Link>
      </td>

      <td className="px-6 py-4">
        <StatusBadge status={student.status} />
      </td>

      <td className="px-6 py-4">
        {attentionCount === 0 ? (
          <span className="text-sm text-gray-600">None</span>
        ) : (
          <div className="flex max-w-xl flex-wrap gap-1.5">
            {student.attentionConcepts
              .slice(0, 3)
              .map((concept) => (
                <span
                  key={`${concept.conceptOrder}-${concept.concept}`}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-gray-300"
                >
                  {concept.concept}
                </span>
              ))}

            {attentionCount > 3 && (
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-gray-500">
                +{attentionCount - 3} more
              </span>
            )}
          </div>
        )}
      </td>

      <td className="px-6 py-4 text-right">
        <Link
          href={`/teacher/dashboard/student/${student.studentId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          View Student
          <span aria-hidden="true">→</span>
        </Link>
      </td>
    </tr>
  );
}


/* -------------------------------------------------------------------------- */
/* Student mobile card                                                        */
/* -------------------------------------------------------------------------- */

function StudentCard({ student }) {
  const attentionCount = student.attentionConcepts?.length ?? 0;

  return (
    <Link
      href={`/teacher/dashboard/student/${student.studentId}`}
      className="block p-5 transition-colors hover:bg-white/[0.025]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate font-medium text-white">
            {student.name || 'Unnamed Student'}
          </div>

          <div className="mt-1 text-xs text-gray-500">
            {student.registrationId || 'No registration ID'}
          </div>
        </div>

        <StatusBadge status={student.status} />
      </div>

      {attentionCount > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-gray-500">
            Concepts needing attention
          </div>

          <div className="flex flex-wrap gap-1.5">
            {student.attentionConcepts
              .slice(0, 4)
              .map((concept) => (
                <span
                  key={`${concept.conceptOrder}-${concept.concept}`}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-gray-300"
                >
                  {concept.concept}
                </span>
              ))}

            {attentionCount > 4 && (
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-gray-500">
                +{attentionCount - 4}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {attentionCount}{' '}
          {attentionCount === 1 ? 'concept' : 'concepts'} needing attention
        </span>

        <span className="font-medium text-indigo-300">
          View profile →
        </span>
      </div>
    </Link>
  );
}


/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }) {
  const config = {
    AT_RISK: {
      label: 'At Risk',
      className:
        'border-red-400/20 bg-red-400/10 text-red-300',
    },
    LAGGING: {
      label: 'Lagging',
      className:
        'border-amber-400/20 bg-amber-400/10 text-amber-300',
    },
    GOOD: {
      label: 'Good',
      className:
        'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    },
    NO_ACTIVITY: {
      label: 'No Activity',
      className:
        'border-white/10 bg-white/[0.04] text-gray-400',
    },
  };

  const current = config[status] || config.NO_ACTIVITY;

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${current.className}`}
    >
      {current.label}
    </span>
  );
}


/* -------------------------------------------------------------------------- */
/* Concept gap                                                                */
/* -------------------------------------------------------------------------- */

function ConceptGapRow({ concept }) {
  const attention = concept.studentsNeedingAttention ?? 0;
  const knowledgeGap = concept.studentsWithKnowledgeGap ?? 0;
  const hasData = concept.hasAssessmentData;

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600">
            #{concept.conceptOrder}
          </span>

          <h3 className="truncate text-sm font-medium text-gray-200">
            {concept.concept}
          </h3>
        </div>

        <div className="mt-1 pl-8 text-xs text-gray-500">
          {hasData
            ? `${attention} ${attention === 1 ? 'student' : 'students'
            } needing attention`
            : 'No assessment data yet'}
        </div>
      </div>

      <div className="flex items-center gap-3 pl-8 sm:pl-0">
        <MetricPill
          label="Knowledge gaps"
          value={knowledgeGap}
        />

        <MetricPill
          label="Attention"
          value={attention}
        />
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Stat card                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, tone = 'default' }) {
  const toneClasses = {
    default: 'text-white',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    danger: 'text-red-300',
    muted: 'text-gray-400',
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-4">
      <div className="text-xs font-medium text-gray-500">
        {label}
      </div>

      <div
        className={`mt-2 text-2xl font-semibold tracking-tight ${toneClasses[tone]}`}
      >
        {value}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Metric pill                                                                */
/* -------------------------------------------------------------------------- */

function MetricPill({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </div>

      <div className="mt-0.5 text-sm font-semibold text-gray-200">
        {value}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

function EmptyAttentionState() {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-xl text-emerald-300">
        ✓
      </div>

      <h3 className="mt-4 text-sm font-semibold text-white">
        No students need attention
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
        There are currently no students with knowledge gaps or
        disengaged-guessing signals.
      </p>
    </div>
  );
}