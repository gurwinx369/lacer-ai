import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Course from '@/models/Course';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
import ConceptMastery from '@/models/ConceptMastery';
import StudentDashboardShell from './StudentDashboardShell';

export const metadata = {
  title: 'Dashboard — Lacer AI',
  description: 'Your personalized learning roadmap powered by Lacer AI',
};

export default async function StudentDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    redirect('/student/login');
  }

  await dbConnect();

  const student = await User.findById(session.userId).lean();
  if (!student) redirect('/student/login');

  // Find the confirmed DSA course
  const course = await Course.findOne({ slug: 'dsa', confirmedAt: { $ne: null } }).lean();

  if (!course) {
    return (
      <StudentDashboardShell
        studentName={student.name}
        xp={student.xp ?? 0}
        streak={student.streak ?? 0}
        todayHomework={null}
        masterySnapshot={[]}
        levels={[]}
        courseReady={false}
      />
    );
  }

  const courseId = course._id.toString();
  const rawLevels = course.generatedStructure?.levels ?? [];

  // Mastery map
  const masteryDoc = await ConceptMastery.findOne({
    student: session.userId,
    course: course._id,
  }).lean();

  const masterySnapshot = [];
  const masteryMap = {};
  if (masteryDoc?.conceptMastery) {
    for (const [concept, entry] of Object.entries(masteryDoc.conceptMastery)) {
      masteryMap[concept] = entry;
      masterySnapshot.push({
        concept,
        verdict: entry.verdict,
        posterior: entry.posterior ?? null,
      });
    }
    masterySnapshot.sort((a, b) => (a.posterior ?? 0) - (b.posterior ?? 0));
  }

  // Quiz attempts for this student
  const attempts = await QuizAttempt.find({
    student: session.userId,
    course: course._id,
  })
    .select('quiz score totalQuestions')
    .lean();

  const attemptedQuizIds = new Set(attempts.map((a) => a.quiz.toString()));

  // All quizzes for this course
  const quizzes = await Quiz.find({ course: course._id })
    .select('_id level serialNumber title')
    .lean();

  // Today's homework — concept the teacher marked complete today
  const todayISO = new Date().toISOString().slice(0, 10);
  let todayHomework = null;

  for (const lvl of rawLevels) {
    for (const c of lvl.concepts ?? []) {
      const taughtAt = c.taughtAt ?? c.completedAt;
      if (taughtAt && String(taughtAt).slice(0, 10) === todayISO) {
        const availableQuiz = quizzes.find(
          (q) => !attemptedQuizIds.has(q._id.toString())
        );
        todayHomework = {
          conceptName: c.name,
          levelTitle: lvl.title ?? `Level ${lvl.levelNumber}`,
          quizId: availableQuiz?._id?.toString() ?? null,
          courseId,
        };
        break;
      }
    }
    if (todayHomework) break;
  }

  // Build level/concept tree
  const levels = rawLevels.map((lvl) => ({
    levelNumber: lvl.levelNumber ?? lvl.number ?? 1,
    title: lvl.title ?? `Level ${lvl.levelNumber ?? 1}`,
    isUnlocked: (lvl.concepts ?? []).some((c) => c.isUnlocked || c.taughtAt || c.completedAt),
    concepts: (lvl.concepts ?? []).map((c) => ({
      name: c.name,
      isUnlocked: !!(c.isUnlocked || c.taughtAt || c.completedAt),
      taughtAt: c.taughtAt ?? c.completedAt ?? null,
      verdict: masteryMap[c.name]?.verdict ?? null,
    })),
  }));

  return (
    <StudentDashboardShell
      studentName={student.name}
      xp={student.xp ?? 0}
      streak={student.streak ?? 0}
      todayHomework={todayHomework}
      masterySnapshot={masterySnapshot}
      levels={levels}
      courseReady={true}
      courseId={courseId}
    />
  );
}
