'use client';

import { useState, useEffect } from 'react';

export default function ProgressionTab({ levels }) {
  const [progressionMap, setProgressionMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProgression() {
      try {
        const res = await fetch('/api/teacher/course/progression');
        if (!res.ok) {
          throw new Error('Failed to load progression');
        }
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

  async function toggleConcept(levelOrder, conceptOrder, currentCompleted) {
    if (currentCompleted) {
      if (!window.confirm('Mark this concept as not taught? Students may lose access to dependent levels based on the corrected progression. Existing assessment results will not be deleted.')) {
        return;
      }
    }

    // Optimistic update
    const previousMap = { ...progressionMap };
    const levelState = progressionMap[levelOrder] || { completedConceptOrders: [] };
    
    const newCompletedOrders = currentCompleted
      ? levelState.completedConceptOrders.filter(o => o !== conceptOrder)
      : [...levelState.completedConceptOrders, conceptOrder];
      
    setProgressionMap({
      ...progressionMap,
      [levelOrder]: {
        ...levelState,
        completedConceptOrders: newCompletedOrders
      }
    });

    try {
      const res = await fetch('/api/teacher/course/progression', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelOrder,
          conceptOrder,
          completed: !currentCompleted
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update');
      }
      
      const data = await res.json();
      setProgressionMap(data.progressionMap);
    } catch (err) {
      // Revert on error
      setProgressionMap(previousMap);
      alert('Failed to update progression. Please try again.');
    }
  }

  if (loading) {
    return <div className="text-gray-400 text-sm animate-pulse">Loading progression state...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {levels.map((level, i) => {
        const pState = progressionMap[level.order] || { completedConceptOrders: [], teacherStatus: 'not_started', studentUnlocked: false };
        const completedCount = pState.completedConceptOrders.length;
        const totalCount = level.concepts?.length || 0;
        const isTaught = pState.teacherStatus === 'taught';

        return (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${isTaught ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-600/30 text-indigo-300'}`}>
                  {level.order}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{level.title}</h3>
                  <div className="text-xs mt-0.5 flex gap-2">
                    <span className={isTaught ? 'text-emerald-400' : 'text-gray-400'}>
                      {completedCount} / {totalCount} Concepts Taught
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className={pState.studentUnlocked ? 'text-indigo-400' : 'text-gray-500'}>
                      {pState.studentUnlocked ? '🔓 Unlocked for Students' : '🔒 Locked'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-white/5">
              {(level.concepts || []).map((concept, ci) => {
                const isCompleted = pState.completedConceptOrders.includes(concept.order);
                
                return (
                  <div key={ci} className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
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
        );
      })}
    </div>
  );
}
