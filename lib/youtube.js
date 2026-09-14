/**
 * lib/youtube.js
 * 
 * Safely extracts the 11-character videoId from a YouTube URL.
 */

// This matches the YOUTUBE_URL_PATTERN from models/Course.js
const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w\-]{11})(&.*)?$/;

/**
 * Parses a YouTube URL and returns the 11-character video ID.
 * Returns null if the URL is invalid or unsupported.
 * @param {string} url 
 * @returns {string | null}
 */
export function extractYoutubeId(url) {
  if (typeof url !== 'string') return null;
  const match = url.trim().match(YOUTUBE_URL_PATTERN);
  return match && match[4] ? match[4] : null;
}
