/**
 * GET  /api/teacher/course/progression
 * PATCH /api/teacher/course/progression
 *
 * Teacher reads and updates progression state.
 * All state lives in Course.progression — no Level collection.
 *
 * GET response:
 *   { progressionMap: Record<levelOrder, { teacherStatus, levelTaught, studentUnlocked, completedConceptOrders }> }
 *
 * PATCH body — two mutually exclusive modes:
 *
 *   Mode A: Concept toggle
 *   { levelOrder: number, conceptOrder: number, completed: boolean }
 *
 *   Mode B: Level taught toggle
 *   { levelOrder: number, markTaught: boolean }
 *     markTaught=true  → marks the level explicitly taught
 *     markTaught=false → unmarks it (derived student access becomes locked)
 *
 *   IMPORTANT for markTaught=true:
 *     Backend enforces sequential teaching order.
 *     Level N (N > 1) cannot be marked taught unless Level N-1 is already taught.
 *     Enforced server-side; UI-only enforcement is insufficient.
 *
 *   IMPORTANT for markTaught=false (unmark):
 *     Only this level's levelTaught flag is cleared.
 *     Dependent levels' levelTaught flags are NOT mutated.
 *     Student access for dependent levels is DERIVED from prerequisites —
 *     they become locked because their prerequisite is no longer taught.
 *     QuizAttempt, AssignmentAttempt, ConceptMastery are NOT deleted.
 *
 * Authorization:
 *   - Must be authenticated teacher
 *   - Teacher must own the course (createdBy === session.userId)
 *   - Course must be in 'ready' status
 *   - levelOrder must exist in generatedStructure
 *   - conceptOrder (Mode A) must exist within that level
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { buildProgressionMap, canMarkLevelTaught } from '@/lib/progression';

const DSA_SLUG = 'dsa';

// ── Shared auth + course resolution ──────────────────────────────────────────

async function resolveTeacherCourse(session) {
  await connectDB();
  const course = await Course.findOne({
    slug: DSA_SLUG,
    createdBy: session.userId,
  });
  return course; // Mongoose doc (not .lean()) so we can call .save()
}

// ── GET /api/teacher/course/progression ──────────────────────────────────────

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const course = await resolveTeacherCourse(session);

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (course.status !== 'ready') {
      return NextResponse.json(
        { error: 'Course is not yet ready. Generate and confirm the structure first.' },
        { status: 400 }
      );
    }

    const levels = course.generatedStructure?.levels ?? [];
    const progression = course.progression ?? [];

    return NextResponse.json({
      progressionMap: buildProgressionMap(levels, progression),
    });
  } catch (err) {
    console.error('[GET /api/teacher/course/progression]', err.message);
    return NextResponse.json({ error: 'Failed to load progression.' }, { status: 500 });
  }
}

// ── PATCH /api/teacher/course/progression ─────────────────────────────────────

export async function PATCH(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { levelOrder, conceptOrder, completed, markTaught } = body ?? {};

  // ── Detect mode ──────────────────────────────────────────────────────────
  const isModeB = markTaught !== undefined;
  const isModeA = !isModeB;

  // ── Shared: levelOrder validation ────────────────────────────────────────
  if (typeof levelOrder !== 'number' || !Number.isInteger(levelOrder) || levelOrder < 1) {
    return NextResponse.json(
      { error: 'levelOrder must be a positive integer.' },
      { status: 400 }
    );
  }

  if (isModeA) {
    // Mode A — concept toggle validation
    if (
      typeof conceptOrder !== 'number' || !Number.isInteger(conceptOrder) || conceptOrder < 1 ||
      typeof completed !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Concept toggle requires: levelOrder (int), conceptOrder (int), completed (boolean).' },
        { status: 400 }
      );
    }
  } else {
    // Mode B — markTaught validation
    if (typeof markTaught !== 'boolean') {
      return NextResponse.json(
        { error: 'markTaught must be a boolean.' },
        { status: 400 }
      );
    }
  }

  try {
    const course = await resolveTeacherCourse(session);

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (course.status !== 'ready') {
      return NextResponse.json(
        { error: 'Course must be in "ready" status to update progression.' },
        { status: 400 }
      );
    }

    // ── Validate level exists in canonical curriculum ─────────────────────
    const levels = course.generatedStructure?.levels ?? [];
    const level = levels.find((l) => l.order === levelOrder);
    if (!level) {
      return NextResponse.json(
        { error: `Level with order ${levelOrder} does not exist in this course.` },
        { status: 400 }
      );
    }

    if (isModeA) {
      // ── Mode A: Concept toggle ─────────────────────────────────────────
      const conceptExists = (level.concepts ?? []).some((c) => c.order === conceptOrder);
      if (!conceptExists) {
        return NextResponse.json(
          { error: `Concept with order ${conceptOrder} does not exist in level ${levelOrder}.` },
          { status: 400 }
        );
      }

      // Idempotent upsert on the embedded progression array.
      const progression = course.progression ?? [];
      const existingIndex = progression.findIndex((p) => p.levelOrder === levelOrder);

      if (existingIndex === -1) {
        // First interaction with this level — create the entry.
        const newEntry = {
          levelOrder,
          levelTaught: false,
          completedConceptOrders: completed ? [conceptOrder] : [],
          updatedAt: new Date(),
        };
        await Course.updateOne(
          { _id: course._id },
          { $push: { progression: newEntry } }
        );
      } else if (completed) {
        // $addToSet prevents duplicates natively.
        await Course.updateOne(
          { _id: course._id, 'progression.levelOrder': levelOrder },
          {
            $addToSet: { 'progression.$.completedConceptOrders': conceptOrder },
            $set: { 'progression.$.updatedAt': new Date() },
          }
        );
      } else {
        // $pull removes the value; safe even if not present.
        await Course.updateOne(
          { _id: course._id, 'progression.levelOrder': levelOrder },
          {
            $pull: { 'progression.$.completedConceptOrders': conceptOrder },
            $set: { 'progression.$.updatedAt': new Date() },
          }
        );
      }
    } else {
      // ── Mode B: Level taught toggle ────────────────────────────────────

      if (markTaught) {
        // ── Sequential enforcement: Level N requires Level N-1 to be taught ──
        const currentProgression = course.progression ?? [];
        if (!canMarkLevelTaught(levels, currentProgression, levelOrder)) {
          const prereqOrder = levelOrder - 1;
          return NextResponse.json(
            {
              error: `Level ${levelOrder} cannot be marked taught until Level ${prereqOrder} is taught first.`,
            },
            { status: 409 }
          );
        }
      }

      // Concurrency-safe upsert using positional $ operator.
      // Check if an entry for this level already exists.
      const existingEntry = (course.progression ?? []).find((p) => p.levelOrder === levelOrder);

      if (!existingEntry) {
        // Create new progression entry with levelTaught set.
        const newEntry = {
          levelOrder,
          levelTaught: markTaught,
          completedConceptOrders: [],
          updatedAt: new Date(),
        };
        await Course.updateOne(
          { _id: course._id },
          { $push: { progression: newEntry } }
        );
      } else {
        // Update only levelTaught and updatedAt — never touch completedConceptOrders.
        await Course.updateOne(
          { _id: course._id, 'progression.levelOrder': levelOrder },
          {
            $set: {
              'progression.$.levelTaught': markTaught,
              'progression.$.updatedAt': new Date(),
            },
          }
        );
      }
    }

    // Re-fetch updated document to return authoritative state.
    const updated = await Course.findById(course._id).lean();

    return NextResponse.json({
      progressionMap: buildProgressionMap(
        updated.generatedStructure?.levels ?? [],
        updated.progression ?? []
      ),
    });
  } catch (err) {
    console.error('[PATCH /api/teacher/course/progression]', err.message);
    return NextResponse.json({ error: 'Failed to update progression.' }, { status: 500 });
  }
}
