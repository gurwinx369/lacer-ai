'use client';

import { useMemo } from 'react';

/**
 * Helper to convert seconds to MM:SS format
 */
function formatSecondsToTime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return '';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function YoutubePlayer({ videoId, startSeconds, endSeconds }) {
  const isValid = useMemo(() => {
    if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) return false;
    if (typeof startSeconds !== 'number' || isNaN(startSeconds) || startSeconds < 0) return false;
    if (typeof endSeconds !== 'number' || isNaN(endSeconds) || endSeconds <= startSeconds) return false;
    return true;
  }, [videoId, startSeconds, endSeconds]);

  if (!isValid) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-red-400 text-sm">Unable to load the video segment. Invalid parameters provided.</p>
      </div>
    );
  }

  // Using Option B: embed with start param and explicit UI text
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startSeconds}`;

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
        <iframe
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        ></iframe>
      </div>
      <div className="mt-3 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Relevant section: {formatSecondsToTime(startSeconds)} – {formatSecondsToTime(endSeconds)}
        </span>
      </div>
    </div>
  );
}
