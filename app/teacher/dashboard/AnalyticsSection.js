'use client';

export default function AnalyticsSection({ analytics }) {
  if (!analytics) return null;

  const { summary, conceptGaps, studentsNeedingAttention } = analytics;

  return (
    <div className="space-y-8 mt-8">
      {/* Metric cards */}
      <section aria-label="Class overview">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Class Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Students" value={summary.totalStudents} accent="neutral" />
          <StatCard label="Good Standing" value={summary.goodStudents} accent="success" />
          <StatCard label="Lagging" value={summary.laggingStudents} accent="warning" />
          <StatCard label="At Risk" value={summary.atRiskStudents} accent="danger" />
          <StatCard label="No Activity" value={summary.noActivityStudents} accent="neutral" />
        </div>
        {summary.noActivityStudents > 0 && summary.totalStudents > 0 && summary.noActivityStudents === summary.totalStudents && (
          <p className="mt-3 text-xs text-gray-600 italic">
            Students haven&apos;t completed assessments yet.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Class Concept Performance */}
        <section aria-label="Class concept performance">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Class Concept Performance
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            {conceptGaps.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">
                No learning gaps detected.
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Concept</th>
                    <th scope="col" className="px-6 py-3 font-medium">Students needing attention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {conceptGaps.map((gap) => (
                    <tr key={gap.conceptOrder}>
                      <td className="px-6 py-4 text-white font-medium">{gap.concept}</td>
                      <td className="px-6 py-4">
                        {!gap.hasAssessmentData ? (
                          <span className="text-gray-500">No assessment data</span>
                        ) : gap.studentsNeedingAttention > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                            {gap.studentsNeedingAttention} student{gap.studentsNeedingAttention !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">0 students</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Students Needing Attention */}
        <section aria-label="Students needing attention">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Students Needing Attention
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            {studentsNeedingAttention.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">
                No students currently need attention.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Student</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 font-medium">Concepts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {studentsNeedingAttention.map((student, idx) => (
                    <tr key={student.registrationId || idx}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.registrationId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            student.status === 'AT_RISK'
                              ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                          }`}
                        >
                          {student.status === 'AT_RISK' ? 'At Risk' : 'Lagging'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {student.attentionConcepts.map((c) => (
                            <span
                              key={c.conceptOrder}
                              className="inline-flex items-center rounded-md bg-white/5 px-2 py-1 text-xs text-gray-300 ring-1 ring-inset ring-white/10"
                            >
                              {c.concept}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, description, accent }) {
  const accentMap = {
    neutral: 'border-white/10 bg-white/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
    danger: 'border-red-500/20 bg-red-500/5',
  };
  const valueMap = {
    neutral: 'text-white',
    warning: 'text-amber-400',
    success: 'text-emerald-400',
    danger: 'text-red-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${accentMap[accent] ?? accentMap.neutral}`}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueMap[accent] ?? valueMap.neutral}`}>{value}</p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
  );
}
