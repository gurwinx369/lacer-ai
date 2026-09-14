import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { verifyAndGetStudentLevel } from '@/lib/student-course';
import QuizAttempt from '@/models/QuizAttempt';
import { getConceptMastery } from '@/features/concept-mastery/service';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { levelOrder, quizId } = await params;
  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get('attemptId');

  if (!attemptId) {
    return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
  }

  try {
    await connectDB();

    // 1. Authorization: Canonical course and level unlock
    const { error: unlockError, status: unlockStatus, course: safeCourse } = await verifyAndGetStudentLevel(levelOrder);
    if (unlockError) {
      return NextResponse.json({ error: unlockError }, { status: unlockStatus });
    }

    // 2. Fetch the attempt (Server-side derived data)
    const attempt = await QuizAttempt.findById(attemptId).lean();

    // Generic not-found response to avoid leaking other students' data
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // 3. Verify complete relationship chain
    if (attempt.student.toString() !== session.userId) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    if (attempt.quiz.toString() !== quizId) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    if (attempt.course.toString() !== safeCourse.id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    if (attempt.levelOrder !== parseInt(levelOrder, 10)) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // 4. Fetch the read-only mastery state for context
    const masteryData = await getConceptMastery(session.userId, safeCourse.id);

    // 5. Calculate concept performance based on the PERSISTED attempt
    const conceptMap = {};
    for (const ans of attempt.answers) {
      if (!conceptMap[ans.concept]) {
        conceptMap[ans.concept] = { total: 0, correct: 0 };
      }
      conceptMap[ans.concept].total++;
      if (ans.isCorrect) {
        conceptMap[ans.concept].correct++;
      }
    }

    const concepts = [];
    const strengths = [];
    const areasToImprove = [];

    for (const [conceptName, stats] of Object.entries(conceptMap)) {
      const accuracy = Math.round((stats.correct / stats.total) * 100);
      
      // Do not fabricate INSUFFICIENT_DATA if missing. Represent missing explicitly as null.
      const masteryEntry = masteryData?.[conceptName];
      const masteryVerdict = masteryEntry ? masteryEntry.verdict : null;

      concepts.push({
        concept: conceptName,
        correct: stats.correct,
        total: stats.total,
        accuracy,
        masteryVerdict,
      });

      // Deterministic threshold logic
      if (accuracy >= 80) {
        strengths.push(conceptName);
      } else if (accuracy < 60) {
        areasToImprove.push(conceptName);
      }
    }

    // Sort concepts alphabetically for consistent UI
    concepts.sort((a, b) => a.concept.localeCompare(b.concept));

    // 6. Return small, student-safe response
    return NextResponse.json(
      {
        attempt: {
          attemptId: attempt._id,
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          percentage: Math.round((attempt.score / attempt.totalQuestions) * 100),
        },
        concepts,
        strengths,
        areasToImprove,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[quiz/results] Unexpected error:', err.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
