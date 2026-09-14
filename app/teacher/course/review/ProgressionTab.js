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
    return <div className="text-zinc-500 font-medium text-sm animate-pulse">Loading progression state...</div>;
  }

  if (error) {
    return <div className="text-rose-500 font-bold text-sm">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
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
          <div key={i} className="rounded-2xl border border-black/[0.04] bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {/* Level header + Mark Level Taught control */}
            <div className="px-6 py-5 border-b border-zinc-100 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Identity */}
                <div className="flex items-start gap-4">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 border ${
                      levelTaught
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {level.order}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 tracking-tight">{level.title}</h3>
                    <div className="text-xs mt-1.5 flex flex-wrap gap-x-2 gap-y-1 font-semibold">
                      <span className={levelTaught ? 'text-emerald-600' : 'text-zinc-500'}>
                        {completedCount} / {totalCount} Concepts Tracked
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className={studentUnlocked ? 'text-emerald-600' : 'text-zinc-400'}>
                        {studentUnlocked ? '🔓 Unlocked for Students' : '🔒 Locked'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mark Level Taught control */}
                <div className="shrink-0 pt-2 sm:pt-0">
                  {levelTaught ? (
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Level Taught
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleLevelTaught(level.order, true)}
                        disabled={isBusy}
                        className="text-[11px] font-bold text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-40 px-1"
                      >
                        {isBusy ? '...' : 'Unmark'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
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
                          ${
                            prevLevelTaught
                              ? 'btn-press-emerald text-white'
                              : 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed'
                          }
                          inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60
                        `}
                      >
                        {isBusy ? (
                          <>
                            <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Updating...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            Mark Level Taught
                          </>
                        )}
                      </button>
                      {!prevLevelTaught && level.order > 1 && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                          Teach Level {level.order - 1} first
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Concept tracking section */}
            <div className="bg-zinc-50/50">
              <div className="px-6 py-3 border-b border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Concept Tracking (analytics only)
                </p>
              </div>
              <div className="divide-y divide-zinc-100">
                {(level.concepts || []).map((concept, ci) => {
                  const isCompleted = pState.completedConceptOrders.includes(concept.order);
                  return (
                    <div
                      key={ci}
                      className="px-6 py-4 flex items-center justify-between hover:bg-white transition-colors"
                    >
                      <div className="flex flex-col pr-4">
                        <span
                          className={`text-sm font-bold ${
                            isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-900'
                          }`}
                        >
                          {concept.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleConcept(level.order, concept.order, isCompleted)}
                        className={`
                          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 ease-out-expo focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                          ${isCompleted ? 'bg-emerald-500' : 'bg-zinc-300'}
                        `}
                        role="switch"
                        aria-checked={isCompleted}
                        aria-label={`Mark ${concept.title} as ${isCompleted ? 'not ' : ''}taught`}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                            transition duration-200 ease-out-expo
                            ${isCompleted ? 'translate-x-5' : 'translate-x-0'}
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
