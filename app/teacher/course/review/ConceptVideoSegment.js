'use client';

import { useState } from 'react';

/**
 * Convert seconds to MM:SS.
 */
function formatSecondsToTime(totalSeconds) {
  if (
    typeof totalSeconds !== 'number' ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds < 0
  ) {
    return '';
  }

  const total = Math.floor(totalSeconds);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Convert MM:SS or raw seconds into seconds.
 */
function parseTimeToSeconds(timeStr) {
  if (typeof timeStr !== 'string' || !timeStr.trim()) {
    return NaN;
  }

  const value = timeStr.trim();
  const parts = value.split(':');

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);

    if (
      Number.isFinite(minutes) &&
      Number.isFinite(seconds) &&
      minutes >= 0 &&
      seconds >= 0 &&
      seconds < 60
    ) {
      return minutes * 60 + seconds;
    }

    return NaN;
  }

  if (parts.length === 1) {
    const seconds = Number(parts[0]);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds;
    }
  }

  return NaN;
}

/**
 * ConceptVideoSegment
 *
 * AI-generated mapping is the primary path.
 * Manual timestamps are available as a correction/fallback.
 *
 * Props:
 *   courseConfirmed: whether the course has been confirmed
 *   levelOrder: canonical level order
 *   conceptOrder: canonical concept order
 *   initialChunk: { startSeconds, endSeconds } | null
 */
export default function ConceptVideoSegment({
  courseConfirmed,
  levelOrder,
  conceptOrder,
  initialChunk,
}) {
  const [savedChunk, setSavedChunk] = useState(initialChunk || null);
  const [editing, setEditing] = useState(false);

  const [startStr, setStartStr] = useState(
    formatSecondsToTime(initialChunk?.startSeconds)
  );
  const [endStr, setEndStr] = useState(
    formatSecondsToTime(initialChunk?.endSeconds)
  );

  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSave() {
    setErrorMsg('');

    if (!startStr || !endStr) {
      setErrorMsg('Provide both start and end times.');
      setStatus('error');
      return;
    }

    const startSeconds = parseTimeToSeconds(startStr);
    const endSeconds = parseTimeToSeconds(endStr);

    if (!Number.isFinite(startSeconds) || startSeconds < 0) {
      setErrorMsg('Invalid start time. Use MM:SS or seconds.');
      setStatus('error');
      return;
    }

    if (!Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
      setErrorMsg('End time must be greater than start time.');
      setStatus('error');
      return;
    }

    setStatus('saving');

    try {
      const response = await fetch(
        '/api/teacher/course/concept/video-segment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            levelOrder,
            conceptOrder,
            startSeconds,
            endSeconds,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        setErrorMsg(
          data?.error || 'Failed to save the video segment.'
        );
        setStatus('error');
        return;
      }

      setSavedChunk({
        startSeconds,
        endSeconds,
      });

      setStatus('idle');
      setEditing(false);
    } catch {
      setErrorMsg(
        'Unable to save the video segment. Check your connection and try again.'
      );
      setStatus('error');
    }
  }

  function handleOpenEdit() {
    setStartStr(
      formatSecondsToTime(savedChunk?.startSeconds)
    );

    setEndStr(
      formatSecondsToTime(savedChunk?.endSeconds)
    );

    setStatus('idle');
    setErrorMsg('');
    setEditing(true);
  }

  function handleOpenAdd() {
    setStartStr('');
    setEndStr('');
    setStatus('idle');
    setErrorMsg('');
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setStatus('idle');
    setErrorMsg('');

    setStartStr(
      formatSecondsToTime(savedChunk?.startSeconds)
    );

    setEndStr(
      formatSecondsToTime(savedChunk?.endSeconds)
    );
  }

  /*
   * AI mapping exists.
   *
   * This is the normal state after automatic video mapping.
   */
  if (savedChunk && !editing) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
            <svg
              className="h-3.5 w-3.5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-emerald-400">
              Video mapped
            </span>

            <span className="text-[11px] text-gray-500">
              {formatSecondsToTime(savedChunk.startSeconds)}
              {' – '}
              {formatSecondsToTime(savedChunk.endSeconds)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="text-xs font-medium text-gray-500 transition-colors hover:text-indigo-400"
        >
          Correct timestamps
        </button>
      </div>
    );
  }

  /*
   * No mapping exists.
   *
   * Manual entry remains available as a fallback.
   */
  if (!savedChunk && !editing) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />

          <span className="text-xs italic text-gray-500">
            No video mapping found
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="text-xs font-medium text-gray-500 transition-colors hover:text-indigo-400"
        >
          Add manually
        </button>
      </div>
    );
  }

  /*
   * Manual correction / fallback form.
   */
  return (
    <div className="mt-3 rounded-lg border border-white/5 bg-black/20 p-3">
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-300">
          {savedChunk
            ? 'Correct Video Mapping'
            : 'Add Video Mapping'}
        </p>

        <p className="mt-0.5 text-[11px] text-gray-600">
          Enter the section containing this concept.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`video-start-${levelOrder}-${conceptOrder}`}
            className="text-[11px] font-medium text-gray-500"
          >
            Start
          </label>

          <input
            id={`video-start-${levelOrder}-${conceptOrder}`}
            type="text"
            inputMode="numeric"
            placeholder="00:00"
            value={startStr}
            onChange={(event) =>
              setStartStr(event.target.value)
            }
            className="w-20 rounded border border-white/10 bg-gray-900 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`video-end-${levelOrder}-${conceptOrder}`}
            className="text-[11px] font-medium text-gray-500"
          >
            End
          </label>

          <input
            id={`video-end-${levelOrder}-${conceptOrder}`}
            type="text"
            inputMode="numeric"
            placeholder="00:00"
            value={endStr}
            onChange={(event) =>
              setEndStr(event.target.value)
            }
            className="w-20 rounded border border-white/10 bg-gray-900 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving'}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={status === 'saving'}
          className="rounded bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {status === 'error' && (
        <p className="mt-2 text-xs text-red-400">
          {errorMsg}
        </p>
      )}
    </div>
  );
}