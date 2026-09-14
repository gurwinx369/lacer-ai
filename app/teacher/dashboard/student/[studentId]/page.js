import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import Course from '@/models/Course';
import { getStudentPerformance } from '@/lib/student-performance';

function StatusBadge({ status }) {
  const map = {
    GOOD: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Good Standing' },
    LAGGING: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Lagging' },
    AT_RISK: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'At Risk' },
    NO_ACTIVITY: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'No Activity' },
  };
  const config = map[status] || map.NO_ACTIVITY;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ConceptStatus({ status }) {
  const map = {
    MASTERY: { text: 'text-green-400', label: 'Mastered' },
    DEVELOPING: { text: 'text-blue-400', label: 'Developing' },
    KNOWLEDGE_GAP: { text: 'text-red-400', label: 'Learning Gap' },
    DISENGAGED_GUESSING: { text: 'text-amber-400', label: 'Needs Attention' },
    INSUFFICIENT_DATA: { text: 'text-gray-500', label: 'Not enough data' },
  };
  const config = map[status] || map.INSUFFICIENT_DATA;
  return <span className={`text-sm ${config.text}`}>{config.label}</span>;
}

function formatDate(isoString) {
  if (!isoString) return 'Never';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function StudentPerformancePage({ params }) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    redirect('/teacher/login');
  }

  const { studentId } = await params;

  const dsaCourse = await Course.findOne({
    slug: 'dsa',
    createdBy: session.userId,
    status: 'ready',
  }).lean();

  if (!dsaCourse) {
    notFound();
  }

  const data = await getStudentPerformance({
    teacherId: session.userId,
    studentId,
    dsaCourse,
  });

  if (!data) {
    notFound();
  }

  const { student, summary, concepts, learningGaps, recentAssessments } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teacher/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300">
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Student Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{student.name}</h1>
            <p className="mt-1 text-sm text-gray-400">ID: {student.registrationId} &bull; Course: DSA</p>
          </div>
          <StatusBadge status={student.status} />
        </section>

        {/* Overall Performance */}
        <section aria-label="Overall Performance">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Overall Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Assessment Attempts</div>
              <div className="text-2xl font-semibold text-white">{summary.totalAssessments}</div>
            </div>
            <div className="bg-gray-900 border border-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Concepts Assessed</div>
              <div className="text-2xl font-semibold text-white">{summary.assessedConcepts}</div>
            </div>
            <div className="bg-gray-900 border border-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Concepts Needing Attention</div>
              <div className="text-2xl font-semibold text-white">{summary.attentionConcepts}</div>
            </div>
          </div>
        </section>

        {/* Concept Performance Table */}
        <section aria-label="Concept Performance">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Concept Performance
          </h2>
          <div className="bg-gray-900 border border-white/5 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-300 w-16">#</th>
                    <th className="px-4 py-3 font-medium text-gray-300">Concept</th>
                    <th className="px-4 py-3 font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-300">Attempts</th>
                    <th className="px-4 py-3 font-medium text-gray-300">Last Assessed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {concepts.map((c) => (
                    <tr key={c.conceptOrder} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-gray-500">{c.conceptOrder}</td>
                      <td className="px-4 py-3 text-gray-200">{c.concept}</td>
                      <td className="px-4 py-3">
                        <ConceptStatus status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-400">{c.attempts > 0 ? c.attempts : '-'}</td>
                      <td className="px-4 py-3 text-gray-400">{formatDate(c.lastUpdatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Diagnostic Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Learning Gaps & Interventions */}
          <section className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Learning Gaps
              </h2>
              {learningGaps.length === 0 ? (
                <div className="bg-gray-900 border border-white/5 rounded-lg p-6 text-center text-sm text-gray-400">
                  No confirmed learning gaps detected.
                </div>
              ) : (
                <ul className="space-y-2">
                  {learningGaps.map((gap) => (
                    <li key={gap.conceptOrder} className="bg-gray-900 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-red-100">{gap.concept}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Reference Context (For Gaps)
              </h2>
              {learningGaps.length === 0 ? (
                <p className="text-sm text-gray-500 italic">N/A</p>
              ) : (
                <ul className="space-y-3">
                  {learningGaps.map((gap) => {
                    const cInfo = concepts.find(c => c.concept === gap.concept);
                    const seg = cInfo?.referenceSegment;
                    return (
                      <li key={`ref-${gap.conceptOrder}`} className="bg-gray-900 border border-white/5 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-200 mb-1">{gap.concept}</div>
                        {seg ? (
                          <div className="text-xs text-indigo-300 bg-indigo-500/10 inline-block px-2 py-1 rounded">
                            Reference segment configured: {Math.floor(seg.startSeconds / 60)}:{String(Math.floor(seg.startSeconds % 60)).padStart(2, '0')} - {Math.floor(seg.endSeconds / 60)}:{String(Math.floor(seg.endSeconds % 60)).padStart(2, '0')}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">No reference segment configured</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Recent Assessments */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Recent Assessments
            </h2>
            {recentAssessments.length === 0 ? (
              <div className="bg-gray-900 border border-white/5 rounded-lg p-6 text-center text-sm text-gray-400">
                No assessments taken yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {recentAssessments.map((attempt, idx) => {
                  const pct = Math.round((attempt.score / attempt.totalQuestions) * 100) || 0;
                  return (
                    <li key={idx} className="bg-gray-900 border border-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{attempt.quizTitle}</div>
                        <div className="text-xs text-gray-500">{formatDate(attempt.submittedAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">{pct}%</div>
                        <div className="text-xs text-gray-500">{attempt.score} / {attempt.totalQuestions}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

      </main>
    </div>
  );
}
