'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const YOUTUBE_HINT = 'e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...';

export default function CourseSetupForm({ existingCourse }) {
  const router = useRouter();

  const [syllabusFile, setSyllabusFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState(existingCourse?.youtubeUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(existingCourse?.status ?? 'draft');

  const isBusy = saving || processing;
  const hasExistingSyllabus = !!existingCourse?.syllabusFileMeta?.originalName;

  async function handleSaveAndProcess(e) {
    e.preventDefault();
    setError('');

    if (!syllabusFile && !hasExistingSyllabus) {
      setError('Please upload a PDF syllabus.');
      return;
    }

    if (syllabusFile) {
      if (!syllabusFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are supported.');
        return;
      }
      if (syllabusFile.size > 5 * 1024 * 1024) {
        setError('The PDF file must be smaller than 5 MB.');
        return;
      }
    }

    // Step 1: Save course setup.
    setSaving(true);
    let saveRes;
    try {
      const formData = new FormData();
      if (syllabusFile) formData.append('syllabusFile', syllabusFile);
      formData.append('youtubeUrl', youtubeUrl);

      // If they didn't upload a new file, but there's an existing one,
      // the backend would need to know we're not clearing it. Wait, the backend
      // requires `syllabusFile`. For this MVP, if they are re-saving, they need
      // to re-upload. To simplify: require re-upload if they want to re-process.
      if (!syllabusFile) {
         setError('Please upload the PDF syllabus again to re-process.');
         setSaving(false);
         return;
      }

      const res = await fetch('/api/teacher/course', {
        method: 'POST',
        body: formData,
      });
      saveRes = await res.json();
      if (!res.ok) {
        setError(saveRes.error || 'Failed to save course setup.');
        setSaving(false);
        return;
      }
    } catch {
      setError('Network error. Please check your connection.');
      setSaving(false);
      return;
    }

    setSaving(false);

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
        <div role="alert" className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Processing status banner */}
      {processing && (
        <div role="status" aria-live="polite" className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 animate-spin text-indigo-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-indigo-900">Analyzing your syllabus…</p>
              <p className="text-xs text-indigo-700/80 mt-0.5">
                Gemini is extracting the curriculum and generating a daily teaching plan. This may take 15–30 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus PDF Upload */}
      <div className="bg-[var(--surface-card)] p-6 rounded-2xl shadow-sm border border-[var(--border)] transition-shadow hover:shadow-md">
        <label htmlFor="syllabusFile" className="block text-sm font-semibold text-[var(--foreground)] mb-1">
          Syllabus PDF <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Upload the course syllabus. Lacer AI uses this to build your curriculum and teaching plan.
        </p>
        <div className="relative group cursor-pointer">
          <input
            id="syllabusFile"
            type="file"
            accept=".pdf"
            onChange={(e) => setSyllabusFile(e.target.files[0] || null)}
            disabled={isBusy}
            className="
              block w-full text-sm text-[var(--text-muted)]
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-xl file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all file:transition-colors
              cursor-pointer file:cursor-pointer
            "
          />
        </div>
        {hasExistingSyllabus && !syllabusFile && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Previously uploaded: <span className="font-mono font-medium text-[var(--foreground)] bg-[var(--surface-muted)] px-2 py-1 rounded-md">{existingCourse.syllabusFileMeta.originalName}</span>
          </p>
        )}
      </div>

      {/* YouTube URL */}
      <div className="bg-[var(--surface-card)] p-6 rounded-2xl shadow-sm border border-[var(--border)] transition-shadow hover:shadow-md">
        <label htmlFor="youtubeUrl" className="block text-sm font-semibold text-[var(--foreground)] mb-1">
          Reference YouTube Video <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Add a reference video. This will be used as learning material for relevant concepts.
        </p>
        <input
          id="youtubeUrl"
          type="url"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          disabled={isBusy}
          placeholder={YOUTUBE_HINT}
          className="input-premium"
        />
        <p className="mt-2 text-xs text-[var(--text-faint)]">
          Accepted: youtube.com/watch?v=… or youtu.be/…
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-4">
        <button
          id="course-setup-submit"
          type="submit"
          disabled={isBusy}
          aria-busy={isBusy}
          className="
            flex items-center justify-center gap-2
            btn-press-indigo rounded-xl px-8 py-3
            text-sm font-bold text-white tracking-wide
            disabled:opacity-60 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
          "
        >
          {isBusy ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              {saving ? 'Uploading…' : 'Processing…'}
            </>
          ) : (
            'Save & Process with Gemini'
          )}
        </button>

        {status === 'ready' && !isBusy && (
          <a
            href="/teacher/course/review"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-150 flex items-center gap-1 group"
          >
            View generated structure
            <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
          </a>
        )}
      </div>
    </form>
  );
}
