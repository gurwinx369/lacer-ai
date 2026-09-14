import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { verifyAndGetStudentLevel } from '@/lib/student-course';
import AssignmentAttempt from '@/models/AssignmentAttempt';
import { getConceptMastery } from '@/features/concept-mastery/service';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { levelOrder } = await params;
  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get('attemptId');

  if (!attemptId) {
    return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
  }

  try {
    await connectDB();

    // 1. Authorization: Canonical course and level unlock
    const { error: unlockError, status: unlockStatus, course: safeCourse, level } = await verifyAndGetStudentLevel(levelOrder);
    if (unlockError) {
      return NextResponse.json({ error: unlockError }, { status: unlockStatus });
    }

    // 2. Fetch the attempt (Server-side derived data)
    const attempt = await AssignmentAttempt.findById(attemptId).lean();

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // 3. Verify complete relationship chain
    if (attempt.student.toString() !== session.userId) {
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
      
      const masteryEntry = masteryData?.[conceptName];
      const masteryVerdict = masteryEntry ? masteryEntry.verdict : null;

      const canonicalConcept = level.concepts.find(c => c.title === conceptName);

      concepts.push({
        concept: conceptName,
        conceptOrder: canonicalConcept?.conceptOrder || 999,
        correct: stats.correct,
        total: stats.total,
        accuracy,
        masteryVerdict,
      });

      if (accuracy >= 80) {
        strengths.push(conceptName);
      } else if (accuracy < 60) {
        areasToImprove.push(conceptName);
      }
    }

    concepts.sort((a, b) => a.concept.localeCompare(b.concept));

    // 6. Determine Primary Intervention
    let intervention = null;
    const gaps = concepts.filter(c => c.masteryVerdict === 'KNOWLEDGE_GAP');
    if (gaps.length > 0) {
      gaps.sort((a, b) => {
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        return a.conceptOrder - b.conceptOrder;
      });
      
      const primaryIntervention = gaps[0];
      const canonicalConcept = level.concepts.find(c => c.title === primaryIntervention.concept);
      
      if (canonicalConcept?.videoSegment) {
        intervention = {
          available: true,
          conceptOrder: canonicalConcept.conceptOrder,
          concept: canonicalConcept.title,
          video: canonicalConcept.videoSegment
        };
      } else {
        intervention = {
          available: false,
          conceptOrder: primaryIntervention.conceptOrder,
          concept: primaryIntervention.concept,
          reason: "NO_VIDEO_SEGMENT"
        };
      }
    }

    // 7. Return small, student-safe response
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
        intervention,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[assignment/results] Unexpected error:', err.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
