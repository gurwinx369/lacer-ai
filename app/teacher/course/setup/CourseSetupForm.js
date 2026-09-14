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
        <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Processing status banner */}
      {processing && (
        <div role="status" aria-live="polite" className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4 animate-spin text-indigo-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-indigo-300">Analyzing your syllabus…</p>
              <p className="text-xs text-indigo-400/70 mt-0.5">
                Gemini is extracting the curriculum and generating a daily teaching plan. This may take 15–30 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus PDF Upload */}
      <div>
        <label htmlFor="syllabusFile" className="block text-sm font-medium text-gray-300 mb-1.5">
          Syllabus PDF <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Upload the course syllabus. Lacer AI uses this to build your curriculum and teaching plan.
        </p>
        <input
          id="syllabusFile"
          type="file"
          accept=".pdf"
          onChange={(e) => setSyllabusFile(e.target.files[0] || null)}
          disabled={isBusy}
          className="
            block w-full text-sm text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-600 file:text-white
            hover:file:bg-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
          "
        />
        {hasExistingSyllabus && !syllabusFile && (
          <p className="mt-2 text-xs text-gray-400">
            Previously uploaded: <span className="font-mono text-gray-300">{existingCourse.syllabusFileMeta.originalName}</span>
          </p>
        )}
      </div>

      {/* YouTube URL */}
      <div>
        <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-300 mb-1.5">
          Reference YouTube Video <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Add a reference video. This will be used as learning material for relevant concepts.
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
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              {saving ? 'Uploading…' : 'Processing with Gemini…'}
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
