import User from '../models/User.js';
import QuizAttempt from '../models/QuizAttempt.js';
import AssignmentAttempt from '../models/AssignmentAttempt.js';
import ConceptMastery from '../models/ConceptMastery.js';
import { classifyStudentStatus } from './student-status.js';

/**
 * Retrieves deterministic, read-only analytics for the teacher dashboard.
 * @param {Object} params
 * @param {string} params.teacherId - The ID of the authenticated teacher.
 * @param {Object} params.dsaCourse - The canonical DSA course document (.lean()).
 * @returns {Promise<Object>} Analytics DTO.
 */
export async function getTeacherDashboardAnalytics({ teacherId, dsaCourse }) {
  if (!dsaCourse || dsaCourse.createdBy.toString() !== teacherId.toString()) {
    return _emptyDto();
  }

  // 1. Course: canonical concepts
  const canonicalConcepts = _getCanonicalConcepts(dsaCourse);
  if (canonicalConcepts.length === 0) {
    return _emptyDto();
  }

  // 2. Users: target student population exactly matching the course title
  const students = await User.find({
    role: 'student',
    program: dsaCourse.title,
  })
    .select('_id name registrationId')
    .lean();

  if (students.length === 0) {
    return _emptyDto();
  }

  const studentIds = students.map((s) => s._id);

  // 3. QuizAttempt & AssignmentAttempt: proves assessment activity
  const rawAttempts = await QuizAttempt.find({
    student: { $in: studentIds },
    course: dsaCourse._id,
  })
    .select('student')
    .lean();

  const rawAssignmentAttempts = await AssignmentAttempt.find({
    student: { $in: studentIds },
    course: dsaCourse._id,
  })
    .select('student')
    .lean();

  const activeStudentIds = new Set([
    ...rawAttempts.map((a) => a.student.toString()),
    ...rawAssignmentAttempts.map((a) => a.student.toString())
  ]);

  // 4. ConceptMastery: mastery state
  const rawMasteries = await ConceptMastery.find({
    student: { $in: studentIds },
    course: dsaCourse._id,
  })
    .select('student conceptMastery')
    .lean();

  const masteryByStudent = new Map(
    rawMasteries.map((m) => [m.student.toString(), m.conceptMastery || {}])
  );

  // 5. Deterministic Aggregation
  const summary = {
    totalStudents: students.length,
    laggingStudents: 0,
    goodStudents: 0,
    atRiskStudents: 0,
    noActivityStudents: 0,
  };

  const conceptStatsMap = new Map();
  for (const c of canonicalConcepts) {
    conceptStatsMap.set(c.concept, {
      conceptOrder: c.conceptOrder,
      concept: c.concept,
      studentsWithKnowledgeGap: 0,
      studentsNeedingAttention: 0,
      assessedStudentIds: new Set(),
    });
  }

  const studentsNeedingAttention = [];

  for (const student of students) {
    const sId = student._id.toString();

    const cMasteryMap = masteryByStudent.get(sId) || {};
    const attentionConcepts = [];
    let hasAssessmentEvidence = false;

    // Check each canonical concept
    for (const canonical of canonicalConcepts) {
      const entry = cMasteryMap[canonical.concept];
      if (!entry) continue;

      const verdict = entry.verdict;

      // Track assessment evidence at the concept level
      if (verdict !== 'INSUFFICIENT_DATA') {
        hasAssessmentEvidence = true;
        const stat = conceptStatsMap.get(canonical.concept);
        if (stat) {
          stat.assessedStudentIds.add(sId);
        }
      }

      // Track gaps
      if (verdict === 'KNOWLEDGE_GAP' || verdict === 'DISENGAGED_GUESSING') {
        attentionConcepts.push({
          conceptOrder: canonical.conceptOrder,
          concept: canonical.concept,
        });

        const stat = conceptStatsMap.get(canonical.concept);
        if (stat) {
          stat.studentsNeedingAttention++;
          if (verdict === 'KNOWLEDGE_GAP') {
            stat.studentsWithKnowledgeGap++;
          }
        }
      }
    }

    // Determine Status
    const status = classifyStudentStatus({
      hasActivity: activeStudentIds.has(sId),
      attentionConceptCount: attentionConcepts.length,
    });

    if (status === 'NO_ACTIVITY') {
      summary.noActivityStudents++;
    } else if (status === 'AT_RISK') {
      summary.atRiskStudents++;
      studentsNeedingAttention.push({
        name: student.name,
        registrationId: student.registrationId,
        status,
        attentionConcepts,
      });
    } else if (status === 'LAGGING') {
      summary.laggingStudents++;
      studentsNeedingAttention.push({
        name: student.name,
        registrationId: student.registrationId,
        status,
        attentionConcepts,
      });
    } else if (status === 'GOOD') {
      summary.goodStudents++;
    }
  }

  // Format Concept Gaps Table
  const conceptGaps = Array.from(conceptStatsMap.values())
    .map((stat) => ({
      conceptOrder: stat.conceptOrder,
      concept: stat.concept,
      studentsWithKnowledgeGap: stat.studentsWithKnowledgeGap,
      studentsNeedingAttention: stat.studentsNeedingAttention,
      hasAssessmentData: stat.assessedStudentIds.size > 0,
    }))
    // Sort primarily by studentsNeedingAttention DESC, then conceptOrder ASC
    .sort((a, b) => {
      if (b.studentsNeedingAttention !== a.studentsNeedingAttention) {
        return b.studentsNeedingAttention - a.studentsNeedingAttention;
      }
      return a.conceptOrder - b.conceptOrder;
    });

  // Sort Attention List
  // AT_RISK first, then attentionConcepts.length DESC, then name ASC, then registrationId ASC
  studentsNeedingAttention.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'AT_RISK' ? -1 : 1;
    }
    if (b.attentionConcepts.length !== a.attentionConcepts.length) {
      return b.attentionConcepts.length - a.attentionConcepts.length;
    }
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return a.registrationId.localeCompare(b.registrationId);
  });

  return {
    summary,
    conceptGaps,
    studentsNeedingAttention,
  };
}

function _emptyDto() {
  return {
    summary: {
      totalStudents: 0,
      laggingStudents: 0,
      goodStudents: 0,
      atRiskStudents: 0,
      noActivityStudents: 0,
    },
    conceptGaps: [],
    studentsNeedingAttention: [],
  };
}

function _getCanonicalConcepts(dsaCourse) {
  const list = [];
  if (!dsaCourse.generatedStructure || !Array.isArray(dsaCourse.generatedStructure.levels)) {
    return list;
  }
  let order = 1;
  for (const level of dsaCourse.generatedStructure.levels) {
    if (Array.isArray(level.concepts)) {
      for (const conceptName of level.concepts) {
        list.push({
          conceptOrder: order++,
          concept: conceptName,
        });
      }
    }
  }
  return list;
}
