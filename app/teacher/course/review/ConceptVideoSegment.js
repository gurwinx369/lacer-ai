'use client';

import { useState } from 'react';

/**
 * Helper to convert MM:SS to total seconds.
 */
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return NaN;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10);
    const sec = parseInt(parts[1], 10);
    if (!isNaN(min) && !isNaN(sec) && sec >= 0 && sec < 60) {
      return min * 60 + sec;
    }
  } else if (parts.length === 1) {
    return parseInt(parts[0], 10);
  }
  return NaN;
}

/**
 * Helper to convert seconds to MM:SS
 */
function formatSecondsToTime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return '';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ConceptVideoSegment({ courseConfirmed, levelOrder, conceptOrder, initialChunk }) {
  const [startStr, setStartStr] = useState(formatSecondsToTime(initialChunk?.startSeconds));
  const [endStr, setEndStr] = useState(formatSecondsToTime(initialChunk?.endSeconds));
  const [savedChunk, setSavedChunk] = useState(initialChunk || null);
  
  const [status, setStatus] = useState('idle'); // idle | saving | error | success
  const [errorMsg, setErrorMsg] = useState('');

  // If the course isn't confirmed yet, we don't show the form, or we show it disabled.
  // The requirement says course must be confirmed to save segments.
  if (!courseConfirmed) {
    return null;
  }

  async function handleSave() {
    if (!startStr || !endStr) {
      setErrorMsg('Provide both start and end times');
      setStatus('error');
      return;
    }

    const startSeconds = parseTimeToSeconds(startStr);
    const endSeconds = parseTimeToSeconds(endStr);

    if (isNaN(startSeconds) || startSeconds < 0) {
      setErrorMsg('Invalid Start Time (use MM:SS or seconds)');
      setStatus('error');
      return;
    }

    if (isNaN(endSeconds) || endSeconds <= startSeconds) {
      setErrorMsg('End Time must be greater than Start Time');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setErrorMsg('');

    try {
      const res = await fetch('/api/teacher/course/concept/video-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelOrder,
          conceptOrder,
          startSeconds,
          endSeconds,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSavedChunk({ startSeconds, endSeconds });
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to save');
        setStatus('error');
      }
    } catch (err) {
      setErrorMsg('Network error');
      setStatus('error');
    }
  }

  return (
    <div className="mt-4 rounded-lg bg-black/20 border border-white/5 p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-400">Start</label>
        <input
          type="text"
          placeholder="00:00"
          value={startStr}
          onChange={(e) => setStartStr(e.target.value)}
          className="w-16 bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-400">End</label>
        <input
          type="text"
          placeholder="00:00"
          value={endStr}
          onChange={(e) => setEndStr(e.target.value)}
          className="w-16 bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={status === 'saving'}
        className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving...' : 'Save'}
      </button>

      {status === 'error' && (
        <span className="text-xs text-red-400 ml-2">{errorMsg}</span>
      )}
      
      {status === 'success' && (
        <span className="text-xs text-emerald-400 ml-2">✓ Saved</span>
      )}

      {status === 'idle' && savedChunk && (
        <span className="text-xs text-emerald-500/70 ml-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Configured {formatSecondsToTime(savedChunk.startSeconds)} – {formatSecondsToTime(savedChunk.endSeconds)}
        </span>
      )}
      
      {status === 'idle' && !savedChunk && (
        <span className="text-xs text-gray-600 ml-2 italic">Not configured</span>
      )}
    </div>
  );
}
