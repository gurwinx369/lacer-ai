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
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center bg-white/5 pr-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center justify-between px-5 py-4 text-left transition-colors duration-150 hover:bg-white/5"
          aria-expanded={open}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-bold text-indigo-300">
              {levelOrder}
            </span>

            <div>
              <p className="text-sm font-semibold text-white">
                {level.title}
              </p>

              {level.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">
                  {level.description}
                </p>
              )}
            </div>
          </div>

          <div className="ml-4 flex shrink-0 items-center gap-2">
            <span className="text-xs text-gray-500">
              {level.concepts?.length ?? 0} concepts
            </span>

            <svg
              className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''
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
          <div className="flex items-center gap-1 px-2">
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
              className="p-1 text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
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
              className="p-1 text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
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
              className="p-1 text-red-400 hover:text-red-300"
            >
              Del
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-white/10">
          <div className="divide-y divide-white/5">
            {(level.concepts ?? []).map((concept, ci) => {
              const conceptOrder = concept.order ?? ci + 1;

              return (
                <div key={ci} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-xs text-gray-600">
                      {levelOrder}.{conceptOrder}
                    </span>

                    <div className="min-w-0 flex-1">
                      {editingConcept === concept.order ? (
                        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                            placeholder="Concept Title"
                          />

                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="h-20 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                            placeholder="Description"
                          />

                          <textarea
                            value={editObj}
                            onChange={(e) => setEditObj(e.target.value)}
                            className="h-24 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                            placeholder="Learning Objectives (one per line)"
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingConcept(null)}
                              className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => saveEditConcept(conceptOrder)}
                              className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-500"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-white">
                            {concept.title}
                          </p>

                          {concept.description && (
                            <p className="mt-1 text-xs text-gray-400">
                              {concept.description}
                            </p>
                          )}

                          {concept.learningObjectives?.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {concept.learningObjectives.map((obj, oi) => (
                                <li
                                  key={oi}
                                  className="flex items-start gap-2 text-xs text-gray-500"
                                >
                                  <span className="mt-0.5 shrink-0 text-indigo-500">
                                    •
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
                      <div className="flex flex-col items-center gap-1">
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
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
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
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditConcept(concept)}
                          className="mt-1 p-1 text-xs text-indigo-400 hover:text-indigo-300"
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
                          className="p-1 text-xs text-red-400 hover:text-red-300"
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-white">
          Day {day.day}
        </h4>

        <span className="text-xs font-medium text-gray-500">
          {day.estimatedMinutes} mins
        </span>
      </div>

      <p className="mb-3 text-sm font-medium text-indigo-300">
        {day.objective}
      </p>

      <div className="space-y-1">
        {(day.topics ?? []).map((topic, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <svg
              className="h-3 w-3 text-emerald-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>

            <span className="text-xs text-gray-300">
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
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-400">
            Generated from Syllabus
          </p>

          <p className="text-sm text-gray-300">
            {course.syllabusFileMeta?.originalName ||
              'Syllabus text'}
          </p>

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span>{levels.length} Levels</span>
            <span>{conceptCount} Concepts</span>
            <span>{teachingPlan.length} Days</span>
          </div>
        </div>

        {course.youtubeUrl && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Reference Video
            </p>

            <a
              href={course.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm text-indigo-400 transition-colors hover:text-indigo-300"
            >
              {course.youtubeUrl}
            </a>

            <div className="mt-4 flex flex-wrap items-center gap-3">
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
                className="
                  inline-flex items-center gap-2
                  rounded-lg bg-indigo-600 px-4 py-2
                  text-xs font-semibold text-white
                  transition-colors hover:bg-indigo-500
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                {mappingVideo ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
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
                  </>
                ) : videoChunks.length > 0 ? (
                  'Regenerate Video Mappings'
                ) : (
                  'Generate Video Mappings'
                )}
              </button>

              {videoChunks.length > 0 && (
                <span className="text-xs text-emerald-400">
                  {mappedConceptCount} of {conceptCount} concepts
                  mapped
                </span>
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              AI analyzes the reference video transcript and
              maps relevant sections to the generated curriculum.
              You can correct individual timestamps below.
            </p>

            {mappingResult && (
              <p className="mt-2 text-xs text-emerald-400">
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
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {mutating && (
        <div className="animate-pulse text-sm text-indigo-400">
          Updating roadmap structure...
        </div>
      )}

      {/* Assessment Quizzes */}
      {confirmed && levels.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 bg-indigo-500/5 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Assessment Quizzes
              </h3>

              <p className="mt-0.5 text-xs text-gray-400">
                Generate exactly 5 Gemini-powered quizzes per
                level.
              </p>
            </div>

            <span className="text-xs text-gray-500">
              {levels.length} levels
            </span>
          </div>

          <div className="divide-y divide-white/5 px-4 py-2">
            {levels.map((level) => (
              <div
                key={level.order}
                className="pt-2 first:pt-0"
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

      <div>
        <div className="mb-5 flex gap-6 border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'curriculum'
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
              className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'plan'
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
              className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'progression'
                  ? 'border-b-2 border-indigo-500 text-indigo-400'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Classroom Progression
            </button>
          )}
        </div>

        {activeTab === 'curriculum' && (
          <div className="space-y-3">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachingPlan.map((day, i) => (
              <TeachingPlanDay key={i} day={day} />
            ))}
          </div>
        )}

        {activeTab === 'progression' && confirmed && (
          <ProgressionTab levels={levels} />
        )}
      </div>

      {/* Confirmation */}
      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-4">
        {confirmed ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Structure Confirmed
            </span>

            <span className="text-xs text-gray-500">
              Course structure is ready for student progression.
            </span>
          </div>
        ) : (
          <>
            <button
              id="confirm-structure-btn"
              type="button"
              onClick={handleConfirm}
              disabled={
                confirming ||
                regenerating ||
                mutating ||
                mappingVideo
              }
              aria-busy={confirming}
              className="
                flex items-center justify-center gap-2
                rounded-lg bg-emerald-600 px-6 py-2.5
                text-sm font-medium text-white
                transition-all duration-150
                hover:bg-emerald-500
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-60
                disabled:active:scale-100
              "
            >
              {confirming
                ? 'Confirming...'
                : '✓ Confirm Structure & Plan'}
            </button>

            <button
              type="button"
              onClick={handleRegenerate}
              disabled={
                regenerating ||
                confirming ||
                mutating ||
                mappingVideo
              }
              className="
                flex items-center justify-center gap-2
                rounded-lg border border-white/20 bg-white/10 px-6 py-2.5
                text-sm font-medium text-white
                transition-all duration-150
                hover:bg-white/20
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-60
                disabled:active:scale-100
              "
            >
              {regenerating
                ? 'Regenerating...'
                : '↻ Regenerate Roadmap'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}