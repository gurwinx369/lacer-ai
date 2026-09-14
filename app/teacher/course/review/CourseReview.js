'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProgressionTab from './ProgressionTab';

function LevelCard({ level, index }) {
  const [open, setOpen] = useState(index === 0); // First level open by default.

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors duration-150"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-bold shrink-0">
            {level.order ?? index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{level.title}</p>
            {level.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{level.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-xs text-gray-500">{level.concepts?.length ?? 0} concepts</span>
          <svg className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {(level.concepts ?? []).map((concept, ci) => (
            <div key={ci} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-600 mt-0.5 font-mono">
                  {(level.order ?? index + 1)}.{concept.order ?? ci + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{concept.title}</p>
                  {concept.description && <p className="text-xs text-gray-400 mt-1">{concept.description}</p>}
                  {concept.learningObjectives?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {concept.learningObjectives.map((obj, oi) => (
                        <li key={oi} className="flex items-start gap-2 text-xs text-gray-500">
                          <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeachingPlanDay({ day }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-white">Day {day.day}</h4>
        <span className="text-xs font-medium text-gray-500">{day.estimatedMinutes} mins</span>
      </div>
      <p className="text-sm text-indigo-300 font-medium mb-3">{day.objective}</p>
      <div className="space-y-1">
        {(day.topics ?? []).map((topic, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-300">{topic}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CourseReview({ course }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(!!course.confirmedAt);
  const [error, setError] = useState('');
  // Show progression tab by default if already confirmed
  const [activeTab, setActiveTab] = useState(course.confirmedAt ? 'progression' : 'curriculum');

  const levels = course.generatedStructure?.levels ?? [];
  const teachingPlan = course.teachingPlan ?? course.generatedStructure?.teachingPlan ?? [];

  async function handleConfirm() {
    setError('');
    setConfirming(true);
    try {
      const res = await fetch('/api/teacher/course/confirm', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Confirmation failed. Please try again.');
        return;
      }
      setConfirmed(true);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Summary section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Syllabus source */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5">
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-1">Generated from Syllabus</p>
          <p className="text-sm text-gray-300">
            {course.syllabusFileMeta?.originalName || 'Syllabus text'}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span>{levels.length} Levels</span>
            <span>{levels.reduce((sum, l) => sum + (l.concepts?.length ?? 0), 0)} Concepts</span>
            <span>{teachingPlan.length} Days</span>
          </div>
        </div>

        {/* Reference video */}
        {course.youtubeUrl && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Reference Video</p>
            <a
              href={course.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate block"
            >
              {course.youtubeUrl}
            </a>
            <p className="mt-3 text-xs text-gray-500">Stored for future video-chunk extraction.</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="border-b border-white/10 mb-5 flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === 'curriculum'
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Curriculum Structure
          </button>
          {teachingPlan.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'plan'
                  ? 'border-b-2 border-indigo-500 text-indigo-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Daily Teaching Plan
            </button>
          )}
          {confirmed && (
            <button
              type="button"
              onClick={() => setActiveTab('progression')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'progression'
                  ? 'border-b-2 border-indigo-500 text-indigo-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Classroom Progression
            </button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'curriculum' && (
          <div className="space-y-3">
            {levels.map((level, i) => (
              <LevelCard key={i} level={level} index={i} />
            ))}
          </div>
        )}

        {activeTab === 'plan' && teachingPlan.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachingPlan.map((day, i) => (
              <TeachingPlanDay key={i} day={day} />
            ))}
          </div>
        )}

        {activeTab === 'progression' && confirmed && (
          <ProgressionTab levels={levels} />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
        {confirmed ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Structure Confirmed
            </span>
            <span className="text-xs text-gray-500">
              Course structure is ready for student progression.
            </span>
          </div>
        ) : (
          <button
            id="confirm-structure-btn"
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            aria-busy={confirming}
            className="
              flex items-center justify-center gap-2
              rounded-lg bg-emerald-600 px-6 py-2.5
              text-sm font-medium text-white
              hover:bg-emerald-500 active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
              transition-all duration-150
            "
          >
            {confirming ? 'Confirming…' : '✓ Confirm Structure & Plan'}
          </button>
        )}

        <a
          href="/teacher/course/setup"
          className="text-sm text-gray-400 hover:text-white transition-colors duration-150"
        >
          ← Edit Setup & Re-process
        </a>
      </div>
    </div>
  );
}
