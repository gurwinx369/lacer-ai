'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const YOUTUBE_HINT =
  'e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...';

export default function CourseSetupForm({ existingCourse }) {
  const router = useRouter();

  const [syllabus, setSyllabus] = useState(existingCourse?.syllabus ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(existingCourse?.youtubeUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(existingCourse?.status ?? 'draft');

  const isBusy = saving || processing;

  async function handleSaveAndProcess(e) {
    e.preventDefault();
    setError('');

    if (syllabus.trim().length < 50) {
      setError('Syllabus must be at least 50 characters.');
      return;
    }

    // Step 1: Save course setup.
    setSaving(true);
    let saveRes;
    try {
      const res = await fetch('/api/teacher/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabus, youtubeUrl }),
      });
      saveRes = await res.json();
      if (!res.ok) {
        setError(saveRes.error || 'Failed to save course setup.');
        return;
      }
    } catch {
      setError('Network error. Please check your connection.');
      return;
    } finally {
      setSaving(false);
    }

    // Step 2: Trigger Gemini processing.
    setProcessing(true);
    setStatus('processing');
    try {
      const res = await fetch('/api/teacher/course/process', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Processing failed. Please try again.');
        setStatus('failed');
        return;
      }

      setStatus(data.course.status);

      if (data.course.status === 'ready') {
        router.push('/teacher/course/review');
      }
    } catch {
      setError('Network error during processing. Please try again.');
      setStatus('failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSaveAndProcess} noValidate className="space-y-6">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Processing status banner */}
      {processing && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <svg
              className="h-4 w-4 animate-spin text-indigo-400 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-indigo-300">Analyzing your syllabus…</p>
              <p className="text-xs text-indigo-400/70 mt-0.5">
                Gemini is identifying learning levels, concepts, and objectives. This may take 15–30 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus */}
      <div>
        <label htmlFor="syllabus" className="block text-sm font-medium text-gray-300 mb-1.5">
          Course Syllabus <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Paste your DSA syllabus or outline. The more detail you provide, the better the
          generated structure will be. Minimum 50 characters.
        </p>
        <textarea
          id="syllabus"
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          disabled={isBusy}
          rows={14}
          placeholder={`Example:\nUnit 1: Arrays and Strings\n- Array declaration and initialization\n- Array traversal and searching\n- Two-pointer technique\n- String manipulation\n\nUnit 2: Linked Lists\n- Singly linked lists\n- Doubly linked lists\n- Traversal, insertion, deletion\n...`}
          className="
            w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-3
            text-sm text-white placeholder:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-y transition-colors duration-150 font-mono leading-relaxed
          "
        />
        <p className="mt-1 text-xs text-gray-600">
          {syllabus.trim().length} characters
          {syllabus.trim().length > 0 && syllabus.trim().length < 50 && (
            <span className="text-amber-500"> — need at least 50</span>
          )}
        </p>
      </div>

      {/* YouTube URL */}
      <div>
        <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-300 mb-1.5">
          Reference YouTube Video <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Provide a reference DSA lecture or playlist URL. This will be stored as the course
          reference video for future video-chunk recommendations.
        </p>
        <input
          id="youtubeUrl"
          type="url"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          disabled={isBusy}
          placeholder={YOUTUBE_HINT}
          className="
            w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
            text-sm text-white placeholder:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
        <p className="mt-1 text-xs text-gray-600">
          Accepted: youtube.com/watch?v=… or youtu.be/…
        </p>
      </div>

      {/* Note about YouTube */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-xs text-amber-400/80">
          <span className="font-medium text-amber-400">Note:</span> Lacer AI will structure the
          course from your syllabus text. The YouTube URL is stored as a reference for future
          video-chunk recommendations — video content is not analyzed in this release.
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <button
          id="course-setup-submit"
          type="submit"
          disabled={isBusy}
          aria-busy={isBusy}
          className="
            flex items-center justify-center gap-2
            rounded-lg bg-indigo-600 px-6 py-2.5
            text-sm font-medium text-white
            hover:bg-indigo-500 active:scale-[0.98]
            disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          "
        >
          {isBusy ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              {saving ? 'Saving…' : 'Processing with Gemini…'}
            </>
          ) : (
            'Save & Process with Gemini'
          )}
        </button>

        {status === 'ready' && !isBusy && (
          <a
            href="/teacher/course/review"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-150"
          >
            View generated structure →
          </a>
        )}
      </div>
    </form>
  );
}
