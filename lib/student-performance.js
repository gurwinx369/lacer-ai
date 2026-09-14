import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import AssignmentAttempt from '../models/AssignmentAttempt.js';
import ConceptMastery from '../models/ConceptMastery.js';
import { extractYoutubeId } from './youtube.js';
import { classifyStudentStatus } from './student-status.js';

/**
 * Retrieves read-only, diagnostic performance data for a specific student.
 * 
 * @param {Object} params
 * @param {string} params.teacherId - The ID of the authenticated teacher.
 * @param {string} params.studentId - The ID of the student to look up.
 * @param {Object} params.dsaCourse - The canonical DSA course document (.lean()).
 * @returns {Promise<Object|null>} Safe DTO or null if unauthorized/not-found.
 */
export async function getStudentPerformance({ teacherId, studentId, dsaCourse }) {
  if (!dsaCourse || dsaCourse.createdBy.toString() !== teacherId.toString()) {
    return null;
  }

  // 1. Verify student identity and association with course
  const student = await User.findOne({
    _id: studentId,
    role: 'student',
    program: dsaCourse.title,
  }).select('name registrationId').lean();

  if (!student) {
    return null;
  }

  // 2. Determine exact Canonical Concepts and Video mapping
  const canonicalConcepts = [];
  const videoChunksByConcept = new Map();
  const videoId = extractYoutubeId(dsaCourse.youtubeUrl);

  if (dsaCourse.generatedStructure && Array.isArray(dsaCourse.generatedStructure.levels)) {
    let order = 1;
    for (const level of dsaCourse.generatedStructure.levels) {
      if (Array.isArray(level.concepts)) {
        for (const c of level.concepts) {
          canonicalConcepts.push({
            conceptOrder: order,
            concept: c.title || c, // Check if it's an object or string
            levelOrder: level.order,
          });
          order++;
        }
      }
    }
    // videoChunks processing - wait, Course.generatedStructure.levels[i].concepts was string array in previous versions but the model might just be strings. Let me verify.
    // In teacher-dashboard.js, we did: canonicalConcepts.push({ conceptOrder: order++, concept: conceptName })
    // In student-course.js, we did: c.order, c.title
    // Actually, in `models/Course.js`, generatedStructure.levels contains `{ concepts: [String] }`
    // Wait, let's fix the canonical concept extraction to match teacher-dashboard.
  }

  canonicalConcepts.length = 0; // reset
  if (dsaCourse.generatedStructure && Array.isArray(dsaCourse.generatedStructure.levels)) {
    let order = 1;
    for (const level of dsaCourse.generatedStructure.levels) {
      if (Array.isArray(level.concepts)) {
        let fallbackLocalOrder = 1;
        for (const c of level.concepts) {
          const conceptString = typeof c === 'string' ? c : c.title;
          const localOrder = (typeof c === 'object' && c.order) ? c.order : fallbackLocalOrder;
          
          canonicalConcepts.push({
            conceptOrder: order,
            concept: conceptString,
            levelOrder: level.order,
          });

          if (videoId && Array.isArray(dsaCourse.videoChunks)) {
            const chunk = dsaCourse.videoChunks.find(
              (vc) => vc.levelOrder === level.order && vc.conceptOrder === localOrder
            );
            if (chunk) {
              videoChunksByConcept.set(conceptString, {
                videoId,
                startSeconds: chunk.startSeconds,
                endSeconds: chunk.endSeconds,
              });
            }
          }
          order++;
          fallbackLocalOrder++;
        }
      }
    }
  }

  if (canonicalConcepts.length === 0) {
    return null;
  }

  // 3. Quiz & Assignment Attempts
  const totalQuizAssessments = await QuizAttempt.countDocuments({
    student: studentId,
    course: dsaCourse._id,
  });
  const totalAssignmentAssessments = await AssignmentAttempt.countDocuments({
    student: studentId,
    course: dsaCourse._id,
  });

  const totalAssessments = totalQuizAssessments + totalAssignmentAssessments;
  const hasActivity = totalAssessments > 0;

  const rawRecentQuizAttempts = await QuizAttempt.find({
    student: studentId,
    course: dsaCourse._id,
  })
    .sort({ submittedAt: -1, _id: -1 })
    .limit(10)
    .populate('quiz', 'title')
    .select('quiz levelOrder score totalQuestions submittedAt')
    .lean();

  const rawRecentAssignmentAttempts = await AssignmentAttempt.find({
    student: studentId,
    course: dsaCourse._id,
  })
    .sort({ submittedAt: -1, _id: -1 })
    .limit(10)
    .populate('assignment', 'title')
    .select('assignment levelOrder score totalQuestions submittedAt')
    .lean();

  const recentAssessments = [
    ...rawRecentQuizAttempts.map((a) => ({
      quizTitle: a.quiz?.title || `Level ${a.levelOrder} Quiz`,
      type: 'quiz',
      levelOrder: a.levelOrder,
      score: a.score,
      totalQuestions: a.totalQuestions,
      submittedAt: a.submittedAt,
    })),
    ...rawRecentAssignmentAttempts.map((a) => ({
      quizTitle: a.assignment?.title || `Level ${a.levelOrder} Assignment`,
      type: 'assignment',
      levelOrder: a.levelOrder,
      score: a.score,
      totalQuestions: a.totalQuestions,
      submittedAt: a.submittedAt,
    }))
  ]
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, 10)
    .map(a => ({
      ...a,
      submittedAt: a.submittedAt.toISOString()
    }));

  // 4. Concept Mastery
  const masteryDoc = await ConceptMastery.findOne({
    student: studentId,
    course: dsaCourse._id,
  })
    .select('conceptMastery')
    .lean();

  const cMasteryMap = masteryDoc?.conceptMastery || {};

  const concepts = [];
  const learningGaps = [];
  let assessedConceptsCount = 0;
  let attentionConceptCount = 0;

  for (const canonical of canonicalConcepts) {
    const entry = cMasteryMap[canonical.concept];
    
    let status = 'INSUFFICIENT_DATA';
    let attempts = 0;
    let lastUpdatedAt = null;

    if (entry) {
      status = entry.verdict || 'INSUFFICIENT_DATA';
      attempts = entry.attempts || 0;
      if (entry.lastUpdatedAt) {
        lastUpdatedAt = entry.lastUpdatedAt.toISOString();
      }
    }

    if (status !== 'INSUFFICIENT_DATA') {
      assessedConceptsCount++;
    }

    if (status === 'KNOWLEDGE_GAP' || status === 'DISENGAGED_GUESSING') {
      attentionConceptCount++;
      if (status === 'KNOWLEDGE_GAP') {
        learningGaps.push({
          conceptOrder: canonical.conceptOrder,
          concept: canonical.concept,
        });
      }
    }

    concepts.push({
      conceptOrder: canonical.conceptOrder,
      concept: canonical.concept,
      status,
      attempts,
      lastUpdatedAt,
      referenceSegment: videoChunksByConcept.get(canonical.concept) || null,
    });
  }

  // 5. Overall Status Classification
  const studentStatus = classifyStudentStatus({
    hasActivity,
    attentionConceptCount,
    hasAssessmentEvidence: assessedConceptsCount > 0
  });

  // 6. Assemble Safe DTO
  return {
    student: {
      name: student.name,
      registrationId: student.registrationId,
      status: studentStatus,
    },
    summary: {
      totalAssessments,
      assessedConcepts: assessedConceptsCount,
      attentionConcepts: attentionConceptCount,
    },
    concepts,
    learningGaps,
    recentAssessments,
  };
}
