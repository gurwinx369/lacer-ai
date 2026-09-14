import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { verifyAndGetStudentLevel } from '@/lib/student-course';
import QuizzesList from './QuizzesList';
import YoutubePlayer from '@/components/YoutubePlayer';
import { connectDB } from '@/lib/db';
import Assignment from '@/models/Assignment';
import AssignmentAttempt from '@/models/AssignmentAttempt';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;

  return {
    title: `Level ${resolvedParams.levelOrder} — Lacer AI`,
  };
}

function formatSecondsToTime(totalSeconds) {
  if (
    typeof totalSeconds !== 'number' ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds < 0
  ) {
    return '';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function ConceptVideo({ videoSegment }) {
  if (!videoSegment) {
    return (
      <div className="mt-5 rounded-lg border border-white/5 bg-black/10 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"
            />
            <rect
              x="3"
              y="6"
              width="12"
              height="12"
              rx="2"
              strokeWidth={2}
            />
          </svg>

          <span>Video explanation not configured for this concept.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-200">
            Focused Video
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Relevant section:{' '}
            {formatSecondsToTime(videoSegment.startSeconds)} –{' '}
            {formatSecondsToTime(videoSegment.endSeconds)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1">
          <svg
            className="w-3.5 h-3.5 text-indigo-400"
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

          <span className="text-xs font-medium text-indigo-300">
            Watch
          </span>
        </div>
      </div>

      <YoutubePlayer
        videoId={videoSegment.videoId}
        startSeconds={videoSegment.startSeconds}
        endSeconds={videoSegment.endSeconds}
      />
    </div>
  );
}

export default async function StudentLevelPage({ params }) {
  const session = await getSession();

  if (!session) {
    redirect('/student/login');
  }

  if (session.role !== 'student') {
    redirect('/teacher/dashboard');
  }

  const resolvedParams = await params;
  const levelOrder = parseInt(resolvedParams.levelOrder, 10);

  if (Number.isNaN(levelOrder) || levelOrder < 1) {
    redirect('/student/dashboard');
  }

  /*
   * Uses the canonical student-level helper.
   *
   * This verifies:
   * - the course exists and is ready
   * - the requested level exists
   * - the level is unlocked for this student
   *
   * The returned concept DTO already contains videoSegment
   * when the teacher has configured one.
   */
  const result = await verifyAndGetStudentLevel(levelOrder);

  if (result.error) {
    redirect('/student/dashboard');
  }

  const { level, course } = result;

  // Fetch assignment status.
  await connectDB();

  const assignment = await Assignment.findOne({
    course: course.id,
    levelOrder,
  }).lean();

  let assignmentStatus = { exists: false };

  if (assignment) {
    const existingAttempt = await AssignmentAttempt.findOne({
      student: session.userId,
      assignment: assignment._id,
    }).lean();

    if (existingAttempt) {
      assignmentStatus = {
        exists: true,
        state: 'COMPLETED',
        attemptId: existingAttempt._id.toString(),
        score: existingAttempt.score,
        total: existingAttempt.totalQuestions,
        title: assignment.title,
      };
    } else if (new Date(assignment.availableFrom) > new Date()) {
      assignmentStatus = {
        exists: true,
        state: 'LOCKED',
        availableFrom: assignment.availableFrom,
        title: assignment.title,
      };
    } else {
      assignmentStatus = {
        exists: true,
        state: 'AVAILABLE',
        title: assignment.title,
      };
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center gap-4">
          <Link
            href="/student/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Level {level.levelOrder}
            </span>

            <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
              {level.title}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-8">

          {/* Level Header */}
          <div className="border-b border-white/10 pb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-3">
              {level.title}
            </h1>

            {level.description && (
              <p className="text-gray-400 text-lg leading-relaxed">
                {level.description}
              </p>
            )}
          </div>

          {/* Concepts */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.523 5.754 18 7.5 18s3.332-0.523 4.5-1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.523 4.5 1.253v13C19.832 18.523 18.247 18 16.5 18c-1.746 0-3.332.523-4.5 1.253"
                />
              </svg>

              Concepts to Learn
            </h2>

            <div className="grid gap-5">
              {level.concepts.map((concept) => (
                <div
                  key={concept.conceptOrder}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  {/* Concept Header */}
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-sm shrink-0">
                      {concept.conceptOrder}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-medium text-white mb-1">
                        {concept.title}
                      </h3>

                      {concept.description && (
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {concept.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Concept Video */}
                  <ConceptVideo
                    videoSegment={concept.videoSegment}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Quizzes */}
          <QuizzesList levelOrder={level.levelOrder} />

          {/* Level Assignment */}
          {assignmentStatus.exists && (
            <div className="mt-12 space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-fuchsia-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>

                Level Assignment
              </h2>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-medium text-white">
                      {assignmentStatus.title}
                    </h3>

                    {assignmentStatus.state === 'LOCKED' && (
                      <p className="text-sm text-amber-400 mt-1 flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>

                        Available after{' '}
                        {new Date(
                          assignmentStatus.availableFrom
                        ).toLocaleDateString()}
                      </p>
                    )}

                    {assignmentStatus.state === 'AVAILABLE' && (
                      <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>

                        Assignment Available
                      </p>
                    )}

                    {assignmentStatus.state === 'COMPLETED' && (
                      <p className="text-sm text-gray-400 mt-1">
                        Completed • Score: {assignmentStatus.score}/
                        {assignmentStatus.total}
                      </p>
                    )}
                  </div>

                  <div>
                    {assignmentStatus.state === 'LOCKED' && (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg bg-white/5 text-gray-500 font-medium text-sm cursor-not-allowed border border-white/5"
                      >
                        Locked
                      </button>
                    )}

                    {assignmentStatus.state === 'AVAILABLE' && (
                      <Link
                        href={`/student/course/${levelOrder}/assignment`}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors border border-indigo-500/50"
                      >
                        Start Assignment →
                      </Link>
                    )}

                    {assignmentStatus.state === 'COMPLETED' && (
                      <Link
                        href={`/student/course/${levelOrder}/assignment/results?attemptId=${assignmentStatus.attemptId}`}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors border border-white/10"
                      >
                        View Results
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}