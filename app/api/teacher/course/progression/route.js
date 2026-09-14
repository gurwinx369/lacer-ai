/**
 * GET  /api/teacher/course/progression
 * PATCH /api/teacher/course/progression
 *
 * Teacher reads and updates concept completion state.
 * All state lives in Course.progression — no Level collection.
 *
 * GET response:
 *   { progressionMap: Record<levelOrder, { teacherStatus, studentUnlocked, completedConceptOrders }> }
 *
 * PATCH body:
 *   { levelOrder: number, conceptOrder: number, completed: boolean }
 *
 * PATCH response:
 *   { progressionMap: Record<levelOrder, { teacherStatus, studentUnlocked, completedConceptOrders }> }
 *
 * Authorization:
 *   - Must be authenticated teacher
 *   - Teacher must own the course (createdBy === session.userId)
 *   - Course must be in 'ready' status
 *   - levelOrder must exist in generatedStructure
 *   - conceptOrder must exist within that level
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { buildProgressionMap } from '@/lib/progression';

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

  const { levelOrder, conceptOrder, completed } = body ?? {};

  // ── Input type validation ────────────────────────────────────────────────
  if (
    typeof levelOrder !== 'number' || !Number.isInteger(levelOrder) || levelOrder < 1 ||
    typeof conceptOrder !== 'number' || !Number.isInteger(conceptOrder) || conceptOrder < 1 ||
    typeof completed !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'levelOrder and conceptOrder must be positive integers; completed must be boolean.' },
      { status: 400 }
    );
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

    // ── Validate against canonical curriculum — never trust client titles ────
    const levels = course.generatedStructure?.levels ?? [];

    const level = levels.find((l) => l.order === levelOrder);
    if (!level) {
      return NextResponse.json(
        { error: `Level with order ${levelOrder} does not exist in this course.` },
        { status: 400 }
      );
    }

    const conceptExists = (level.concepts ?? []).some((c) => c.order === conceptOrder);
    if (!conceptExists) {
      return NextResponse.json(
        { error: `Concept with order ${conceptOrder} does not exist in level ${levelOrder}.` },
        { status: 400 }
      );
    }

    // ── Idempotent upsert on the embedded progression array ──────────────────
    // Find or create the progression entry for this level.
    const progression = course.progression ?? [];
    const existingIndex = progression.findIndex((p) => p.levelOrder === levelOrder);

    if (existingIndex === -1) {
      // First interaction with this level — create the entry.
      const newEntry = {
        levelOrder,
        completedConceptOrders: completed ? [conceptOrder] : [],
        updatedAt: new Date(),
      };
      // Use $push to atomically add the new level entry
      await Course.updateOne(
        { _id: course._id },
        {
          $push: {
            progression: newEntry,
          },
        }
      );
    } else {
      // Entry exists — add or remove the conceptOrder idempotently.
      if (completed) {
        // $addToSet prevents duplicates natively.
        await Course.updateOne(
          { _id: course._id, 'progression.levelOrder': levelOrder },
          {
            $addToSet: { 'progression.$.completedConceptOrders': conceptOrder },
            $set: { 'progression.$.updatedAt': new Date() },
          }
        );
      } else {
        // $pull removes the value; safe to call even if it isn't present.
        await Course.updateOne(
          { _id: course._id, 'progression.levelOrder': levelOrder },
          {
            $pull: { 'progression.$.completedConceptOrders': conceptOrder },
            $set: { 'progression.$.updatedAt': new Date() },
          }
        );
      }
    }

    // Re-fetch the updated document to return the authoritative state.
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
