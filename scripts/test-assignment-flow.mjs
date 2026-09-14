import mongoose from 'mongoose';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import AssignmentAttempt from '../models/AssignmentAttempt.js';
import ConceptMastery from '../models/ConceptMastery.js';
import { gradeAndPersist } from '../features/concept-mastery/service.js';
import { getTeacherDashboardAnalytics } from '../lib/teacher-dashboard.js';
import { getStudentPerformance } from '../lib/student-performance.js';
import { gradeAttempt } from '../features/concept-mastery/engine.js';

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {}
}

loadEnv();

async function runTests() {
  console.log('Connecting to DB for Assignment Flow Tests...');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });

  let pass = true;
  const assert = (condition, msg) => {
    if (!condition) {
      console.error('❌ FAIL:', msg);
      pass = false;
    } else {
      console.log('✅ PASS:', msg);
    }
  };

  // DB Tests Setup
  const testPrefix = 'TEST_ASSIGNMENT_FLOW_';
  await User.deleteMany({ name: { $regex: '^' + testPrefix } });
  await Course.deleteMany({ title: testPrefix + 'DSA' });
  await Assignment.deleteMany({ title: { $regex: '^' + testPrefix } });

  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();

  const dsaCourse = await Course.create({
    title: testPrefix + 'DSA',
    slug: 'dsa',
    createdBy: teacherId,
    status: 'ready',
    generatedStructure: {
      levels: [
        {
          order: 1,
          concepts: [{ order: 1, title: 'Concept A' }, { order: 2, title: 'Concept B' }],
        },
      ],
    },
  });

  await User.create({
    _id: studentId,
    name: testPrefix + 'Student',
    email: 'test_student_assign@test.com',
    passwordHash: 'dummy',
    role: 'student',
    registrationId: 'REG_TEST_ASSIGN',
    program: dsaCourse.title,
  });

  const courseLean = await Course.findById(dsaCourse._id).lean();

  // Create Assignment
  const assignment = await Assignment.create({
    course: dsaCourse._id,
    levelOrder: 1,
    title: testPrefix + 'Level 1 Assignment',
    description: 'Test assignment',
    availableFrom: new Date(Date.now() - 86400000), // available yesterday
    dueDate: new Date(Date.now() + 86400000), // due tomorrow
    questions: [
      { serialNumber: 1, question: 'Q1', options: ['A', 'B', 'C'], correctAnswer: 0, concept: 'Concept A', difficulty: 'medium' },
      { serialNumber: 2, question: 'Q2', options: ['A', 'B', 'C'], correctAnswer: 1, concept: 'Concept B', difficulty: 'medium' },
    ]
  });

  // Create AssignmentAttempt
  const attempt = await AssignmentAttempt.create({
    student: studentId,
    course: dsaCourse._id,
    assignment: assignment._id,
    levelOrder: 1,
    score: 1, // 1 correct, 1 wrong
    totalQuestions: 2,
    answers: [
      { serialNumber: 1, concept: 'Concept A', difficulty: 'medium', isCorrect: true, correctAnswer: 0, selectedAnswer: 0 },
      { serialNumber: 2, concept: 'Concept B', difficulty: 'medium', isCorrect: false, correctAnswer: 1, selectedAnswer: 0 }
    ]
  });

  // Grade AssignmentAttempt with null responseTimeMs
  await gradeAndPersist(
    studentId.toString(),
    dsaCourse._id.toString(),
    attempt._id.toString(),
    [
      { concept: 'Concept A', difficulty: 'medium', isCorrect: true, responseTimeMs: null },
      { concept: 'Concept B', difficulty: 'medium', isCorrect: false, responseTimeMs: null }
    ]
  );

  // Check Mastery State
  const masteryDoc = await ConceptMastery.findOne({ student: studentId, course: dsaCourse._id });
  assert(masteryDoc != null, 'Mastery doc created');
  assert(masteryDoc.conceptMastery.get('Concept A') != null, 'Concept A graded');
  assert(masteryDoc.conceptMastery.get('Concept B') != null, 'Concept B graded');

  // Since null responseTimeMs gives neutral evidence, let's see if verdict is changed.
  // We can just verify it didn't throw an error and generated some evidence.
  const nullGrade = gradeAttempt(null, 20000, true);
  assert(nullGrade.speedBucket !== 'FAST', 'Null timing does not produce FAST');
  assert(nullGrade.speedBucket === 'MEDIUM', 'Null timing is graded using MEDIUM timing behavior');
  assert(nullGrade.rgbFlag === false, 'Null timing has rgbFlag === false');

  // Test Dashboard Integration
  const dashboard = await getTeacherDashboardAnalytics({ teacherId, dsaCourse: courseLean });
  assert(dashboard.summary.totalStudents === 1, 'Dashboard: 1 student');
  // Student has activity from assignment
  assert(dashboard.summary.noActivityStudents === 0, 'Dashboard: student has activity from assignment');

  // Test Student Performance Integration
  const perf = await getStudentPerformance({ teacherId, studentId, dsaCourse: courseLean });
  assert(perf.summary.totalAssessments === 1, 'Performance: 1 assessment total');
  assert(perf.recentAssessments.length === 1, 'Performance: 1 recent assessment');
  assert(perf.recentAssessments[0].type === 'assignment', 'Performance: recent assessment is assignment');
  assert(perf.recentAssessments[0].quizTitle === testPrefix + 'Level 1 Assignment', 'Performance: recent assessment has correct title');

  // Cleanup
  await User.deleteMany({ name: { $regex: '^' + testPrefix } });
  await Course.deleteMany({ title: testPrefix + 'DSA' });
  await Assignment.deleteMany({ title: { $regex: '^' + testPrefix } });
  await AssignmentAttempt.deleteMany({ student: studentId });
  await ConceptMastery.deleteMany({ student: studentId });

  await mongoose.disconnect();
  process.exit(pass ? 0 : 1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
