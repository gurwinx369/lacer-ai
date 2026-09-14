'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProgressionTab from './ProgressionTab';
import ConceptVideoSegment from './ConceptVideoSegment';
import QuizGenerationControl from './QuizGenerationControl';

function LevelCard({
  level,
  index,
  courseConfirmed,
  videoChunks,
  onMutate,
  totalLevels,
}) {
  const [open, setOpen] = useState(index === 0);

  const [editingConcept, setEditingConcept] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editObj, setEditObj] = useState('');

  function startEditConcept(concept) {
    setEditingConcept(concept.order);
    setEditTitle(concept.title || '');
    setEditDesc(concept.description || '');
    setEditObj((concept.learningObjectives || []).join('\n'));
  }

  function saveEditConcept(conceptOrder) {
    const objectives = editObj
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onMutate({
      action: 'edit-concept',
      levelOrder: level.order,
      conceptOrder,
      title: editTitle,
      description: editDesc,
      learningObjectives: objectives,
    });

    setEditingConcept(null);
  }

  const levelOrder = level.order ?? index + 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center bg-white pr-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center justify-between px-6 py-5 text-left transition-colors duration-150 hover:bg-zinc-50"
          aria-expanded={open}
        >
          <div className="flex items-center gap-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600 border border-emerald-100">
              {levelOrder}
            </span>

            <div>
              <p className="text-base font-bold text-zinc-900 tracking-tight">
                {level.title}
              </p>

              {level.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                  {level.description}
                </p>
              )}
            </div>
          </div>

          <div className="ml-4 flex shrink-0 items-center gap-3">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
              {level.concepts?.length ?? 0} concepts
            </span>

            <svg
              className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''
                }`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {!courseConfirmed && (
          <div className="flex items-center gap-2 px-3">
            <button
              type="button"
              onClick={() =>
                onMutate({
                  action: 'reorder-level',
                  levelOrder,
                  direction: 'up',
                })
              }
              disabled={index === 0}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>

            <button
              type="button"
              onClick={() =>
                onMutate({
                  action: 'reorder-level',
                  levelOrder,
                  direction: 'down',
                })
              }
              disabled={index === totalLevels - 1}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Delete this level and its concepts? This cannot be undone.'
                  )
                ) {
                  onMutate({
                    action: 'delete-level',
                    levelOrder,
                  });
                }
              }}
              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            >
              Del
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-zinc-100 bg-zinc-50/50">
          <div className="divide-y divide-zinc-100">
            {(level.concepts ?? []).map((concept, ci) => {
              const conceptOrder = concept.order ?? ci + 1;

              return (
                <div key={ci} className="px-6 py-5">
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 font-mono text-[11px] font-semibold text-zinc-400">
                      {levelOrder}.{conceptOrder}
                    </span>

                    <div className="min-w-0 flex-1">
                      {editingConcept === concept.order ? (
                        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Concept Title"
                          />

                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="h-20 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Description"
                          />

                          <textarea
                            value={editObj}
                            onChange={(e) => setEditObj(e.target.value)}
                            className="h-24 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Learning Objectives (one per line)"
                          />

                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingConcept(null)}
                              className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => saveEditConcept(conceptOrder)}
                              className="btn-press-emerald rounded-lg px-4 py-2 text-xs font-bold text-white"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-zinc-900">
                            {concept.title}
                          </p>

                          {concept.description && (
                            <p className="mt-1 text-sm text-zinc-500 leading-relaxed max-w-3xl">
                              {concept.description}
                            </p>
                          )}

                          {concept.learningObjectives?.length > 0 && (
                            <ul className="mt-3 space-y-1.5">
                              {concept.learningObjectives.map((obj, oi) => (
                                <li
                                  key={oi}
                                  className="flex items-start gap-2 text-sm text-zinc-600"
                                >
                                  <span className="mt-1 shrink-0 text-emerald-500">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                      <circle cx="6" cy="6" r="3" />
                                    </svg>
                                  </span>
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}

                      {!editingConcept && (
                        <ConceptVideoSegment
                          courseConfirmed={courseConfirmed}
                          levelOrder={levelOrder}
                          conceptOrder={conceptOrder}
                          initialChunk={videoChunks?.find(
                            (vc) =>
                              vc.levelOrder === levelOrder &&
                              vc.conceptOrder === conceptOrder
                          )}
                        />
                      )}
                    </div>

                    {!courseConfirmed && (
                      <div className="flex flex-col items-center gap-1.5 pl-4">
                        <button
                          type="button"
                          onClick={() =>
                            onMutate({
                              action: 'reorder-concept',
                              levelOrder,
                              conceptOrder,
                              direction: 'up',
                            })
                          }
                          disabled={ci === 0}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-30"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onMutate({
                              action: 'reorder-concept',
                              levelOrder,
                              conceptOrder,
                              direction: 'down',
                            })
                          }
                          disabled={
                            ci === (level.concepts?.length ?? 0) - 1
                          }
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-30"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditConcept(concept)}
                          className="mt-2 px-2 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                'Remove this concept from the draft roadmap?'
                              )
                            ) {
                              onMutate({
                                action: 'delete-concept',
                                levelOrder,
                                conceptOrder,
                              });
                            }
                          }}
                          className="mt-1 px-2 py-1 text-[11px] font-bold text-rose-500 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors"
                        >
                          Del
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TeachingPlanDay({ day }) {
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-6 shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-bold text-zinc-900 tracking-tight">
          Day {day.day}
        </h4>

        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {day.estimatedMinutes} mins
        </span>
      </div>

      <p className="mb-4 text-sm font-semibold text-emerald-600 leading-snug">
        {day.objective}
      </p>

      <div className="space-y-2">
        {(day.topics ?? []).map((topic, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>

            <span className="text-sm text-zinc-600">
              {topic}
            </span>
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
  const [activeTab, setActiveTab] = useState(
    course.confirmedAt ? 'progression' : 'curriculum'
  );

  const [mutating, setMutating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [mappingVideo, setMappingVideo] = useState(false);
  const [mappingResult, setMappingResult] = useState(null);

  const levels = course.generatedStructure?.levels ?? [];

  const teachingPlan =
    course.teachingPlan ??
    course.generatedStructure?.teachingPlan ??
    [];

  const videoChunks = course.videoChunks ?? [];

  const conceptCount = levels.reduce(
    (sum, level) => sum + (level.concepts?.length ?? 0),
    0
  );

  const mappedConceptCount = videoChunks.length;

  async function handleMutate(payload) {
    if (mutating) return;

    setMutating(true);
    setError('');

    try {
      const res = await fetch('/api/teacher/course/structure', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update structure.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error while updating structure.');
    } finally {
      setMutating(false);
    }
  }

  async function handleRegenerate() {
    if (
      !window.confirm(
        'This will replace your current draft with a newly generated roadmap from the syllabus. Your current draft edits will be lost.'
      )
    ) {
      return;
    }

    setRegenerating(true);
    setError('');
    setMappingResult(null);

    try {
      const res = await fetch('/api/teacher/course/process', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
          'Regeneration failed. Please try again.'
        );
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error during regeneration.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleGenerateVideoMappings() {
    if (mappingVideo) return;

    if (!course.youtubeUrl) {
      setError(
        'Add a reference YouTube video before generating video mappings.'
      );
      return;
    }

    if (levels.length === 0) {
      setError(
        'Generate the curriculum before generating video mappings.'
      );
      return;
    }

    setMappingVideo(true);
    setError('');
    setMappingResult(null);

    try {
      const res = await fetch(
        '/api/teacher/course/video-map',
        {
          method: 'POST',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
          'Unable to generate video mappings. Please try again.'
        );
        return;
      }

      setMappingResult({
        mapped: Array.isArray(data.videoChunks)
          ? data.videoChunks.length
          : 0,
        durationSeconds: data.durationSeconds,
      });

      router.refresh();
    } catch {
      setError(
        'Network error while generating video mappings.'
      );
    } finally {
      setMappingVideo(false);
    }
  }

  async function handleConfirm() {
    setError('');
    setConfirming(true);

    try {
      const res = await fetch(
        '/api/teacher/course/confirm',
        {
          method: 'POST',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
          'Confirmation failed. Please try again.'
        );
        return;
      }

      setConfirmed(true);
      setActiveTab('progression');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Summary ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Generated from Syllabus
          </p>

          <p className="text-base font-bold text-zinc-900 tracking-tight">
            {course.syllabusFileMeta?.originalName ||
              'Syllabus text'}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
              {levels.length} Levels
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
              {conceptCount} Concepts
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
              {teachingPlan.length} Days
            </span>
          </div>
        </div>

        {course.youtubeUrl && (
          <div className="rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Reference Video
            </p>

            <a
              href={course.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-500"
            >
              {course.youtubeUrl}
            </a>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleGenerateVideoMappings}
                disabled={
                  mappingVideo ||
                  regenerating ||
                  mutating ||
                  confirming ||
                  levels.length === 0
                }
                className="btn-press-ghost rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mappingVideo ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-zinc-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M21 12a9 9 0 00-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Mapping video...
                  </span>
                ) : videoChunks.length > 0 ? (
                  'Regenerate Video Mappings'
                ) : (
                  'Generate Video Mappings'
                )}
              </button>

              {videoChunks.length > 0 && (
                <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
                  {mappedConceptCount} of {conceptCount} concepts mapped
                </span>
              )}
            </div>

            <p className="mt-4 text-xs font-medium leading-relaxed text-zinc-500">
              AI analyzes the reference video transcript and
              maps relevant sections to the generated curriculum.
              You can correct individual timestamps below.
            </p>

            {mappingResult && (
              <p className="mt-3 text-xs font-bold text-emerald-600">
                Video mapping completed for{' '}
                {mappingResult.mapped} concepts.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700"
        >
          {error}
        </div>
      )}

      {mutating && (
        <div className="animate-pulse text-sm font-bold text-emerald-600">
          Updating roadmap structure...
        </div>
      )}

      {/* ── Assessment Quizzes ── */}
      {confirmed && levels.length > 0 && (
        <div className="overflow-hidden rounded-[2rem] border border-black/[0.04] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-6 py-5">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                Assessment Quizzes
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Generate exactly 5 AI-powered quizzes per level.
              </p>
            </div>
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold text-zinc-700">
              {levels.length} levels
            </span>
          </div>

          <div className="divide-y divide-zinc-100 px-2 py-2">
            {levels.map((level) => (
              <div
                key={level.order}
                className="py-1"
              >
                <QuizGenerationControl
                  levelOrder={level.order}
                  levelTitle={level.title}
                  courseConfirmed={confirmed}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs & Content ── */}
      <div>
        <div className="mb-6 flex">
          {/* Segmented Pill Control */}
          <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('curriculum')}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                activeTab === 'curriculum'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Curriculum Structure
            </button>

            {teachingPlan.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('plan')}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                  activeTab === 'plan'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Daily Teaching Plan
              </button>
            )}

            {confirmed && (
              <button
                type="button"
                onClick={() => setActiveTab('progression')}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                  activeTab === 'progression'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Classroom Progression
              </button>
            )}
          </div>
        </div>

        {activeTab === 'curriculum' && (
          <div className="space-y-4">
            {levels.map((level, i) => (
              <LevelCard
                key={level.order || i}
                level={level}
                index={i}
                courseConfirmed={confirmed}
                videoChunks={videoChunks}
                onMutate={handleMutate}
                totalLevels={levels.length}
              />
            ))}
          </div>
        )}

        {activeTab === 'plan' && teachingPlan.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teachingPlan.map((day, i) => (
              <TeachingPlanDay key={i} day={day} />
            ))}
          </div>
        )}

        {activeTab === 'progression' && confirmed && (
          <ProgressionTab levels={levels} />
        )}
      </div>

      {/* ── Confirmation ── */}
      <div className="flex flex-wrap items-center gap-4 pt-4">
        {confirmed ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Course Structure Confirmed
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 w-full flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div>
              <p className="text-base font-bold text-zinc-900">
                Ready to confirm course structure?
              </p>
              <p className="mt-1 text-sm text-zinc-500 max-w-xl leading-relaxed">
                Once confirmed, the structure is locked and classroom progression begins. You can still map videos and track concepts afterward.
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-press-emerald whitespace-nowrap rounded-xl px-8 py-4 text-sm font-bold text-white disabled:opacity-50 w-full md:w-auto text-center"
            >
              {confirming ? 'Confirming...' : 'Confirm Structure'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}