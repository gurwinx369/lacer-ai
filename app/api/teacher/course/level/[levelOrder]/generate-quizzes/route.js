import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Course from '@/models/Course';
import Quiz from '@/models/Quiz';
import { generateQuizzesForLevel } from '@/lib/gemini';

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { levelOrder: levelOrderParam } = await params;
  const levelOrder = parseInt(levelOrderParam, 10);

  if (isNaN(levelOrder) || levelOrder < 1) {
    return NextResponse.json({ error: 'Invalid levelOrder' }, { status: 400 });
  }

  await connectDB();

  // Find the DSA course owned by this teacher
  const course = await Course.findOne({
    slug: 'dsa',
    createdBy: session.userId,
  }).lean();

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  if (course.status !== 'ready' || !course.confirmedAt) {
    return NextResponse.json({ error: 'Course is not ready or confirmed' }, { status: 400 });
  }

  const levels = course.generatedStructure?.levels ?? [];
  const level = levels.find((l) => l.order === levelOrder);

  if (!level) {
    return NextResponse.json({ error: 'Level not found in curriculum' }, { status: 404 });
  }

  // Check if quizzes already exist for this level to enforce idempotency
  const existingQuizCount = await Quiz.countDocuments({
    course: course._id,
    levelOrder,
  });

  if (existingQuizCount >= 5) {
    return NextResponse.json({ error: 'Quizzes already generated for this level' }, { status: 409 });
  }

  try {
    // Generate quizzes using Gemini
    const generatedData = await generateQuizzesForLevel(course.title, level.title, level.concepts);
    
    // Create concept map for resolving conceptOrder -> concept title
    const conceptMap = new Map(level.concepts.map(c => [c.order, c.title]));

    const quizDocs = generatedData.quizzes.map(quiz => {
      const questions = quiz.questions.map(q => ({
        serialNumber: q.serialNumber,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        concept: conceptMap.get(q.conceptOrder),
        difficulty: q.difficulty,
      }));

      return {
        serialNumber: quiz.serialNumber,
        title: quiz.title,
        levelOrder,
        course: course._id,
        questions,
      };
    });

    // We will use ordered insert. If some quizzes exist, it will fail with E11000.
    // If we want to be safe with partial generation, we should filter existing serialNumbers.
    const existingQuizzes = await Quiz.find({ course: course._id, levelOrder }).select('serialNumber').lean();
    const existingSerials = new Set(existingQuizzes.map(q => q.serialNumber));
    
    const newQuizDocs = quizDocs.filter(q => !existingSerials.has(q.serialNumber));

    if (newQuizDocs.length > 0) {
      await Quiz.insertMany(newQuizDocs, { ordered: false }); // Unordered insert to ignore duplicate key errors on race conditions
    }

    return NextResponse.json({ message: `${newQuizDocs.length} quizzes generated.` }, { status: 201 });
  } catch (err) {
    console.error('[teacher/generate-quizzes] Error:', err);
    // Do not leak Gemini API errors
    return NextResponse.json({ error: 'Failed to generate quizzes. Please try again.' }, { status: 500 });
  }
}
