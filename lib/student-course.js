/**
 * lib/student-course.js
 *
 * Server-side helper to fetch the canonical DSA course and build the
 * student-safe payload. Used by both API routes and Server Components
 * to avoid duplicate DB queries and ensure consistent unlock semantics.
 */

import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { buildProgressionMap, isLevelUnlockedForStudents } from '@/lib/progression';
import { extractYoutubeId } from '@/lib/youtube';

/**
 * Fetches the canonical DSA course.
 * @returns {Promise<Object | null>} Lean Course object or null
 */
export async function getCanonicalDsaCourse() {
  await connectDB();
  return Course.findOne({
    slug: 'dsa',
    status: 'ready',
  })
    .sort({ createdAt: 1 })
    .lean();
}

/**
 * Builds the student-safe course and roadmap payload.
 * Strips all internal, teacher-only, and sensitive data.
 * Does NOT expose youtubeUrl.
 *
 * @param {Object} course - The canonical lean Course object
 * @returns {Object} Student payload { course, levels }
 */
export function getStudentCoursePayload(course) {
  if (!course) return { course: null, levels: [] };

  const progressionMap = buildProgressionMap(course.generatedStructure?.levels ?? [], course.progression);

  // Strip course metadata
  const safeCourse = {
    id: course._id.toString(),
    title: course.title,
    description: course.description,
  };

  const videoId = extractYoutubeId(course.youtubeUrl);

  // Build sorted, stripped levels
  const levels = (course.generatedStructure?.levels ?? [])
    .map(level => {
      // Sort concepts safely
      const concepts = (level.concepts ?? [])
        .map(c => {
          const chunk = course.videoChunks?.find(
            vc => vc.levelOrder === level.order && vc.conceptOrder === c.order
          );

          const result = {
            conceptOrder: c.order,
            title: c.title,
            description: c.description || c.objective || '',
          };

          if (chunk && videoId) {
            result.videoSegment = {
              videoId,
              startSeconds: chunk.startSeconds,
              endSeconds: chunk.endSeconds,
            };
          }

          return result;
        })
        .sort((a, b) => a.conceptOrder - b.conceptOrder);

      return {
        levelOrder: level.order,
        title: level.title,
        description: level.description || '',
        unlocked: progressionMap[level.order]?.studentUnlocked ?? false,
        concepts,
      };
    })
    .sort((a, b) => a.levelOrder - b.levelOrder);

  return { course: safeCourse, levels };
}

/**
 * Fetches the canonical course, verifies level unlock state, and returns the level.
 * @param {number} levelOrder
 * @returns {Promise<{ error?: string, status?: number, level?: Object, course?: Object }>}
 */
export async function verifyAndGetStudentLevel(levelOrder) {
  const numericLevelOrder = Number(levelOrder);

  if (!Number.isInteger(numericLevelOrder) || numericLevelOrder < 1) {
    return { error: 'Invalid level', status: 400 };
  }

  const course = await getCanonicalDsaCourse();

  if (!course) {
    return { error: 'Course not found or not ready', status: 404 };
  }

  const { course: safeCourse, levels } = getStudentCoursePayload(course);

  const level = levels.find(
    (l) => l.levelOrder === numericLevelOrder
  );

  if (!level) {
    return { error: 'Level not found', status: 404 };
  }

  if (!level.unlocked) {
    return {
      error: 'Level is locked. Complete the previous level to unlock.',
      status: 403,
    };
  }

  return { course: safeCourse, level };
}
