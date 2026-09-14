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

/**
 * ConceptVideoSegment
 *
 * Displays a concept's video segment mapping.
 * The segment form is OPTIONAL — not shown by default.
 *
 * States:
 *   - No segment saved: shows "Not configured" + "Add Segment" button.
 *   - Segment saved: shows the configured range + "Edit" toggle.
 *   - Edit mode: shows the manual MM:SS form.
 *
 * No AI-based or duration-based timestamp generation is performed.
 * Manual correction is always available via the existing video-segment API.
 *
 * @param {boolean} courseConfirmed
 * @param {number}  levelOrder
 * @param {number}  conceptOrder
 * @param {Object}  [initialChunk]  — from Course.videoChunks ({ startSeconds, endSeconds })
 */
export default function ConceptVideoSegment({ courseConfirmed, levelOrder, conceptOrder, initialChunk }) {
  const [savedChunk, setSavedChunk] = useState(initialChunk || null);
  const [editing, setEditing] = useState(false);

  const [startStr, setStartStr] = useState(formatSecondsToTime(initialChunk?.startSeconds));
  const [endStr, setEndStr] = useState(formatSecondsToTime(initialChunk?.endSeconds));

  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [errorMsg, setErrorMsg] = useState('');

  // Only shown on confirmed courses
  if (!courseConfirmed) return null;

  async function handleSave() {
    setErrorMsg('');

    if (!startStr || !endStr) {
      setErrorMsg('Provide both start and end times');
      setStatus('error');
      return;
    }

    const startSeconds = parseTimeToSeconds(startStr);
    const endSeconds   = parseTimeToSeconds(endStr);

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

    try {
      const res = await fetch('/api/teacher/course/concept/video-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelOrder, conceptOrder, startSeconds, endSeconds }),
      });
      const data = await res.json();

      if (res.ok) {
        setSavedChunk({ startSeconds, endSeconds });
        setStatus('idle');
        setEditing(false);
      } else {
        setErrorMsg(data.error || 'Failed to save');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error');
      setStatus('error');
    }
  }

  function handleOpenEdit() {
    // Pre-fill from saved chunk when opening edit
    setStartStr(formatSecondsToTime(savedChunk?.startSeconds));
    setEndStr(formatSecondsToTime(savedChunk?.endSeconds));
    setStatus('idle');
    setErrorMsg('');
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setStatus('idle');
    setErrorMsg('');
  }

  // ── Display: segment saved, not editing ──
  if (savedChunk && !editing) {
    return (
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-emerald-500/80">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">
            {formatSecondsToTime(savedChunk.startSeconds)} – {formatSecondsToTime(savedChunk.endSeconds)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleOpenEdit}
          className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
        >
          Edit/Correct
        </button>
      </div>
    );
  }

  // ── Display: no segment saved, not editing ──
  if (!savedChunk && !editing) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-gray-600 italic">No video segment</span>
        <button
          type="button"
          onClick={() => {
            setStartStr('');
            setEndStr('');
            setStatus('idle');
            setErrorMsg('');
            setEditing(true);
          }}
          className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
        >
          + Add Segment
        </button>
      </div>
    );
  }

  // ── Edit form ──
  return (
    <div className="mt-3 rounded-lg bg-black/20 border border-white/5 p-3 space-y-2">
      <p className="text-xs text-gray-500 font-medium">
        {savedChunk ? 'Edit Video Segment' : 'Add Video Segment'}
        <span className="ml-1 text-gray-600">(MM:SS or seconds)</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
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
          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          disabled={status === 'saving'}
          className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-400 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
