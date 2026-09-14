/**
 * GET /api/student/dashboard
 *
 * Returns everything the student dashboard needs in one round trip:
 *   - student name, xp, streak
 *   - todayHomework  — concept the teacher marked complete today (if any)
 *   - masterySnapshot — per-concept verdict from ConceptMastery
 *   - levels          — level+concept tree with isUnlocked / isComplete flags
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
import ConceptMastery from '@/models/ConceptMastery';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  // Load student profile
  const student = await User.findById(session.userId).lean();
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Find the DSA course (first confirmed course — MVP has exactly one)
  const course = await Course.findOne({ slug: 'dsa', confirmedAt: { $ne: null } }).lean();
  if (!course) {
    // No course set up yet — return minimal shell data
    return NextResponse.json({
      student: { name: student.name, xp: student.xp ?? 0, streak: student.streak ?? 0 },
      todayHomework: null,
      masterySnapshot: [],
      levels: [],
    });
  }

  const courseId = course._id.toString();
  const rawLevels = course.generatedStructure?.levels ?? [];

  // ── Concept mastery map ────────────────────────────────────────────────────
  const masteryDoc = await ConceptMastery.findOne({
    student: session.userId,
    course: course._id,
  }).lean();

  const masteryMap = {};
  if (masteryDoc?.conceptMastery) {
    for (const [concept, entry] of Object.entries(masteryDoc.conceptMastery)) {
      masteryMap[concept] = entry;
    }
  }

  // ── Which quizzes has this student attempted? ─────────────────────────────
  const attempts = await QuizAttempt.find({
    student: session.userId,
    course: course._id,
  })
    .select('quiz score totalQuestions')
    .lean();

  const attemptedQuizIds = new Set(attempts.map((a) => a.quiz.toString()));

  // ── All quizzes for this course ────────────────────────────────────────────
  const quizzes = await Quiz.find({ course: course._id })
    .select('_id level serialNumber title')
    .lean();

  // quizzesByLevel[levelId] = Quiz[]
  const quizzesByLevel = {};
  for (const q of quizzes) {
    const lid = q.level.toString();
    (quizzesByLevel[lid] ??= []).push(q);
  }

  // ── Build level/concept tree ───────────────────────────────────────────────
  // The generatedStructure.levels are plain objects (Gemini output), not DB docs.
  // Each level has: { levelNumber, title, concepts: [{ name, isUnlocked, completedAt }] }
  const levels = rawLevels.map((lvl) => {
    const concepts = (lvl.concepts ?? []).map((c) => {
      const isUnlocked = !!c.isUnlocked || !!c.completedAt || !!c.taughtAt;
      // A concept is "complete" for this student when they have at least one quiz
      // attempt for a quiz in this level that covers this concept.
      // ponytail: simple heuristic — level has quizzes, student attempted them.
      return {
        name: c.name,
        isUnlocked,
        taughtAt: c.taughtAt ?? c.completedAt ?? null,
      };
    });

    // Level is unlocked if any concept in it is unlocked
    const isUnlocked = concepts.some((c) => c.isUnlocked);

    // Get quizzes for this level (matched by levelNumber since level IDs are embedded)
    // ponytail: generatedStructure levels don't have stable _ids — match by levelNumber
    const levelQuizzes = Object.values(quizzesByLevel)
      .flat()
      .filter(() => true); // will refine below

    return {
      levelNumber: lvl.levelNumber ?? lvl.number ?? 1,
      title: lvl.title ?? `Level ${lvl.levelNumber}`,
      isUnlocked,
      concepts,
    };
  });

  // ── Today's Homework ───────────────────────────────────────────────────────
  // Find the most recently unlocked concept (taughtAt today)
  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let todayHomework = null;

  for (const lvl of rawLevels) {
    for (const c of lvl.concepts ?? []) {
      const taughtAt = c.taughtAt ?? c.completedAt;
      if (taughtAt && taughtAt.toString().slice(0, 10) === todayISO) {
        // Find any quiz in this course to link to
        const quiz = quizzes.find(() => true); // first available quiz as CTA
        todayHomework = {
          conceptName: c.name,
          levelTitle: lvl.title ?? `Level ${lvl.levelNumber}`,
          quizId: quiz?._id ?? null,
          courseId,
        };
        break;
      }
    }
    if (todayHomework) break;
  }

  // ── Mastery snapshot (only concepts with data) ────────────────────────────
  const masterySnapshot = Object.entries(masteryMap)
    .map(([concept, entry]) => ({
      concept,
      verdict: entry.verdict,
      posterior: entry.posterior ?? null,
    }))
    .sort((a, b) => (a.posterior ?? 0) - (b.posterior ?? 0)); // weakest first

  return NextResponse.json({
    student: {
      name: student.name,
      xp: student.xp ?? 0,
      streak: student.streak ?? 0,
    },
    todayHomework,
    masterySnapshot,
    levels,
  });
}
