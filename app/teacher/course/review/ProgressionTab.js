'use client';

import { useState, useEffect } from 'react';

export default function ProgressionTab({ levels }) {
  const [progressionMap, setProgressionMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track which levels have an in-flight level-taught PATCH
  const [togglingLevel, setTogglingLevel] = useState(null);

  useEffect(() => {
    async function loadProgression() {
      try {
        const res = await fetch('/api/teacher/course/progression');
        if (!res.ok) throw new Error('Failed to load progression');
        const data = await res.json();
        setProgressionMap(data.progressionMap || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProgression();
  }, []);

  // ── Level taught toggle ────────────────────────────────────────────────────

  async function toggleLevelTaught(levelOrder, currentTaught) {
    if (togglingLevel === levelOrder) return; // prevent double-click

    if (currentTaught) {
      const ok = window.confirm(
        'Unmarking this level will lock this level and any dependent levels for students.\n\n' +
        'Existing quiz attempts, assignments, and mastery data will not be deleted.'
      );
      if (!ok) return;
    }

    // Optimistic update
    const previous = { ...progressionMap };
    setProgressionMap((prev) => ({
      ...prev,
      [levelOrder]: {
        ...(prev[levelOrder] || {}),
        levelTaught: !currentTaught,
        // Derive studentUnlocked optimistically: will be corrected by server response
        studentUnlocked: !currentTaught,
      },
    }));
    setTogglingLevel(levelOrder);

    try {
      const res = await fetch('/api/teacher/course/progression', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelOrder, markTaught: !currentTaught }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Revert and show error
        setProgressionMap(previous);
        alert(data.error || 'Failed to update level progression. Please try again.');
        return;
      }

      // Replace with authoritative server state
      setProgressionMap(data.progressionMap);
    } catch {
      setProgressionMap(previous);
      alert('Network error. Please try again.');
    } finally {
      setTogglingLevel(null);
    }
  }

  // ── Concept toggle (analytics only) ───────────────────────────────────────

  async function toggleConcept(levelOrder, conceptOrder, currentCompleted) {
    if (currentCompleted) {
      if (!window.confirm(
        'Mark this concept as not taught?\n\n' +
        'This affects concept-level analytics only. ' +
        'Student access is controlled by the level-level "Mark Level Taught" button above.'
      )) return;
    }

    // Optimistic update
    const previous = { ...progressionMap };
    const levelState = progressionMap[levelOrder] || { completedConceptOrders: [] };
    const newCompletedOrders = currentCompleted
      ? levelState.completedConceptOrders.filter((o) => o !== conceptOrder)
      : [...levelState.completedConceptOrders, conceptOrder];

    setProgressionMap({
      ...progressionMap,
      [levelOrder]: { ...levelState, completedConceptOrders: newCompletedOrders },
    });

    try {
      const res = await fetch('/api/teacher/course/progression', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelOrder, conceptOrder, completed: !currentCompleted }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setProgressionMap(data.progressionMap);
    } catch {
      setProgressionMap(previous);
      alert('Failed to update concept tracking. Please try again.');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-gray-400 text-sm animate-pulse">Loading progression state...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {levels.map((level, i) => {
        const pState = progressionMap[level.order] || {
          completedConceptOrders: [],
          teacherStatus: 'not_started',
          levelTaught: false,
          studentUnlocked: false,
        };

        const levelTaught = pState.levelTaught === true;
        const studentUnlocked = pState.studentUnlocked === true;
        const completedCount = pState.completedConceptOrders.length;
        const totalCount = level.concepts?.length || 0;
        const isBusy = togglingLevel === level.order;

        // Check if the previous level is taught (prerequisite for this one)
        const prevLevelTaught =
          level.order === 1
            ? true // Level 1 has no prerequisite
            : (progressionMap[level.order - 1]?.levelTaught === true);

        return (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            {/* Level header + Mark Level Taught control */}
            <div className="px-5 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-start justify-between gap-4">
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                      levelTaught
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-600/30 text-indigo-300'
                    }`}
                  >
                    {level.order}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{level.title}</h3>
                    <div className="text-xs mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className={levelTaught ? 'text-emerald-400' : 'text-gray-400'}>
                        {completedCount} / {totalCount} Concepts Tracked
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className={studentUnlocked ? 'text-indigo-400' : 'text-gray-500'}>
                        {studentUnlocked ? '🔓 Unlocked for Students' : '🔒 Locked'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mark Level Taught control */}
                <div className="shrink-0">
                  {levelTaught ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Level Taught
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleLevelTaught(level.order, true)}
                        disabled={isBusy}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40 px-1"
                      >
                        {isBusy ? '...' : 'Unmark'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        id={`mark-taught-level-${level.order}`}
                        onClick={() => toggleLevelTaught(level.order, false)}
                        disabled={isBusy || !prevLevelTaught}
                        title={
                          !prevLevelTaught
                            ? `Teach Level ${level.order - 1} first`
                            : `Mark Level ${level.order} as taught`
                        }
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${
                            prevLevelTaught
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                              : 'bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed'
                          }
                          disabled:opacity-60
                        `}
                      >
                        {isBusy ? (
                          <>
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Updating...
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            Mark Level Taught
                          </>
                        )}
                      </button>
                      {!prevLevelTaught && level.order > 1 && (
                        <span className="text-xs text-amber-500/70">
                          Teach Level {level.order - 1} first
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Concept tracking section */}
            <div>
              <div className="px-5 py-2 bg-black/10">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Concept Tracking (analytics only)
                </p>
              </div>
              <div className="divide-y divide-white/5">
                {(level.concepts || []).map((concept, ci) => {
                  const isCompleted = pState.completedConceptOrders.includes(concept.order);
                  return (
                    <div
                      key={ci}
                      className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-medium ${
                            isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'
                          }`}
                        >
                          {concept.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleConcept(level.order, concept.order, isCompleted)}
                        className={`
                          relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900
                          ${isCompleted ? 'bg-emerald-500' : 'bg-gray-700'}
                        `}
                        role="switch"
                        aria-checked={isCompleted}
                        aria-label={`Mark ${concept.title} as ${isCompleted ? 'not ' : ''}taught`}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
                            transition duration-200 ease-in-out
                            ${isCompleted ? 'translate-x-4' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
