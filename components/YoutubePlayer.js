'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Convert seconds to MM:SS.
 */
function formatSecondsToTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '';

  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);

  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * YouTubePlayer
 *
 * Plays only the configured concept segment.
 *
 * The YouTube IFrame API is loaded by this component itself.
 * Playback starts at startSeconds and is paused automatically
 * when endSeconds is reached.
 */
export default function YoutubePlayer({
  videoId,
  startSeconds,
  endSeconds,
}) {
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  const [apiReady, setApiReady] = useState(false);
  const [playerError, setPlayerError] = useState('');

  const isValid =
    typeof videoId === 'string' &&
    /^[\w-]{11}$/.test(videoId) &&
    Number.isFinite(startSeconds) &&
    startSeconds >= 0 &&
    Number.isFinite(endSeconds) &&
    endSeconds > startSeconds;

  useEffect(() => {
    if (!isValid) return undefined;

    let cancelled = false;

    function initializePlayer() {
      if (cancelled || !playerContainerRef.current || playerRef.current) {
        return;
      }

      try {
        playerRef.current = new window.YT.Player(playerContainerRef.current, {
          videoId,
          playerVars: {
            start: Math.floor(startSeconds),
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (!cancelled) {
                setApiReady(true);
              }
            },
            onError: () => {
              if (!cancelled) {
                setPlayerError('Unable to load this YouTube video.');
              }
            },
          },
        });
      } catch (error) {
        console.error('[YoutubePlayer] Failed to initialize:', error);

        if (!cancelled) {
          setPlayerError('Unable to load this YouTube video.');
        }
      }
    }

    function loadApi() {
      if (window.YT?.Player) {
        initializePlayer();
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.body.appendChild(script);
      }

      const previousCallback = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        initializePlayer();
      };
    }

    loadApi();

    return () => {
      cancelled = true;

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }

      playerRef.current = null;
    };
  }, [videoId, startSeconds, endSeconds, isValid]);

  /**
   * Enforce the configured end timestamp.
   *
   * We poll the player position because the YouTube IFrame API
   * does not provide a native "stop at this timestamp" option.
   */
  useEffect(() => {
    if (!apiReady || !playerRef.current || !isValid) {
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      const player = playerRef.current;

      if (!player?.getCurrentTime || !player?.pauseVideo) {
        return;
      }

      const currentTime = player.getCurrentTime();

      if (currentTime >= endSeconds) {
        player.pauseVideo();
        player.seekTo(startSeconds, true);
      }
    }, 250);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [apiReady, startSeconds, endSeconds, isValid]);

  if (!isValid) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-red-400 text-sm">
          Unable to load the video segment. Invalid parameters provided.
        </p>
      </div>
    );
  }

  if (playerError) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-red-400 text-sm">{playerError}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
        <div
          ref={playerContainerRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      <div className="mt-3 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
          <svg
            className="w-4 h-4 text-indigo-400"
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
              d="M21 12a9 9 0 11-18 0"
            />
          </svg>

          Relevant section:{' '}
          {formatSecondsToTime(startSeconds)} –{' '}
          {formatSecondsToTime(endSeconds)}
        </span>
      </div>
    </div>
  );
}