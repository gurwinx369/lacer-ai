import mongoose from 'mongoose';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import ConceptMastery from '../models/ConceptMastery.js';
import { getStudentPerformance } from '../lib/student-performance.js';
import { classifyStudentStatus } from '../lib/student-status.js';

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
  console.log('Connecting to DB for Student Performance Tests...');
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

  // Status Consistency Tests
  assert(classifyStudentStatus({ hasActivity: false, attentionConceptCount: 0 }) === 'NO_ACTIVITY', 'Status: NO_ACTIVITY');
  assert(classifyStudentStatus({ hasActivity: true, attentionConceptCount: 0 }) === 'GOOD', 'Status: GOOD');
  assert(classifyStudentStatus({ hasActivity: true, attentionConceptCount: 1 }) === 'LAGGING', 'Status: LAGGING');
  assert(classifyStudentStatus({ hasActivity: true, attentionConceptCount: 2 }) === 'AT_RISK', 'Status: AT_RISK');

  // DB Tests Setup
  const testPrefix = 'TEST_STUDENT_PERF_';
  await User.deleteMany({ name: { $regex: '^' + testPrefix } });
  await Course.deleteMany({ title: testPrefix + 'DSA' });

  const teacher = new mongoose.Types.ObjectId();
  const dsaCourse = await Course.create({
    title: testPrefix + 'DSA',
    slug: 'dsa',
    createdBy: teacher,
    status: 'ready',
    youtubeUrl: 'https://youtube.com/watch?v=abcdef12345',
    videoChunks: [
      { levelOrder: 1, conceptOrder: 1, startSeconds: 0, endSeconds: 60 }
    ],
    generatedStructure: {
      levels: [
        {
          order: 1,
          concepts: [{ order: 1, title: 'C1' }, { order: 2, title: 'C2' }, { order: 3, title: 'C3' }],
        },
      ],
    },
  });

  const courseLean = await Course.findById(dsaCourse._id).lean();

  const createStudent = async (id, nameSuffix, program = courseLean.title) => {
    return User.create({
      _id: id,
      name: testPrefix + nameSuffix,
      email: `${testPrefix.toLowerCase()}${nameSuffix.toLowerCase()}@test.com`,
      passwordHash: 'dummy',
      role: 'student',
      registrationId: 'REG_' + nameSuffix,
      program,
    });
  };

  const s1 = new mongoose.Types.ObjectId(); // NO_ACTIVITY
  const s2 = new mongoose.Types.ObjectId(); // GOOD (Activity, no mastery)
  const s3 = new mongoose.Types.ObjectId(); // LAGGING (1 KNOWLEDGE_GAP)
  const s4 = new mongoose.Types.ObjectId(); // AT_RISK (2 KNOWLEDGE_GAP)
  const s5 = new mongoose.Types.ObjectId(); // Needs Attention (DISENGAGED_GUESSING) -> LAGGING
  const s6 = new mongoose.Types.ObjectId(); // DEVELOPING -> GOOD
  const s7 = new mongoose.Types.ObjectId(); // INSUFFICIENT_DATA -> GOOD
  const sOther = new mongoose.Types.ObjectId(); // Other program

  await Promise.all([
    createStudent(s1, 'NO_ACT'),
    createStudent(s2, 'ACT_NO_MASTERY'),
    createStudent(s3, 'LAG_KG'),
    createStudent(s4, 'RISK_KG'),
    createStudent(s5, 'LAG_DG'),
    createStudent(s6, 'GOOD_DEV'),
    createStudent(s7, 'GOOD_INS'),
    createStudent(sOther, 'OTHER_PROG', 'Other Program'),
  ]);

  // Attempts
  const attemptDocs = [s2, s3, s4, s5, s6, s7].map((sId) => ({
    student: sId,
    course: dsaCourse._id,
    quiz: new mongoose.Types.ObjectId(), // Dummy Quiz ID (won't be populated, that's fine for existence)
    score: 1,
    totalQuestions: 1,
    levelOrder: 1,
    answers: [{ 
      question: new mongoose.Types.ObjectId(), 
      isCorrect: true, 
      correctAnswer: 1, 
      difficulty: 'medium', 
      concept: 'C1', 
      serialNumber: 1 
    }],
  }));

  // Give s2 11 attempts to test pagination/counting
  for(let i=0; i<10; i++) {
    attemptDocs.push({
      student: s2,
      course: dsaCourse._id,
      quiz: new mongoose.Types.ObjectId(),
      score: 1,
      totalQuestions: 1,
      levelOrder: 1,
      answers: [{ question: new mongoose.Types.ObjectId(), isCorrect: true, correctAnswer: 1, difficulty: 'medium', concept: 'C1', serialNumber: 1 }],
      submittedAt: new Date(Date.now() + i * 1000)
    });
  }

  await QuizAttempt.insertMany(attemptDocs);

  // Concept Mastery
  const masteries = [
    { student: s3, course: dsaCourse._id, conceptMastery: { C1: { verdict: 'KNOWLEDGE_GAP' }, ORPHAN: { verdict: 'KNOWLEDGE_GAP' } } },
    { student: s4, course: dsaCourse._id, conceptMastery: { C1: { verdict: 'KNOWLEDGE_GAP' }, C2: { verdict: 'KNOWLEDGE_GAP' } } },
    { student: s5, course: dsaCourse._id, conceptMastery: { C1: { verdict: 'DISENGAGED_GUESSING' } } },
    { student: s6, course: dsaCourse._id, conceptMastery: { C1: { verdict: 'DEVELOPING' } } },
    { student: s7, course: dsaCourse._id, conceptMastery: { C1: { verdict: 'INSUFFICIENT_DATA' } } },
  ];
  await ConceptMastery.insertMany(masteries);

  console.log('Running Tests...');

  // Test Access Control
  const perfOtherTeacher = await getStudentPerformance({ teacherId: new mongoose.Types.ObjectId(), studentId: s3, dsaCourse: courseLean });
  assert(perfOtherTeacher === null, 'Another teacher -> blocked');

  const perfOtherProg = await getStudentPerformance({ teacherId: teacher, studentId: sOther, dsaCourse: courseLean });
  assert(perfOtherProg === null, 'Another program -> blocked');

  const perfInvalidStud = await getStudentPerformance({ teacherId: teacher, studentId: new mongoose.Types.ObjectId(), dsaCourse: courseLean });
  assert(perfInvalidStud === null, 'Invalid student -> blocked');

  // Test S1: NO_ACTIVITY
  const perfS1 = await getStudentPerformance({ teacherId: teacher, studentId: s1, dsaCourse: courseLean });
  assert(perfS1.student.status === 'NO_ACTIVITY', 'S1 is NO_ACTIVITY');

  // Test S2: Pagination & Assessment Count
  const perfS2 = await getStudentPerformance({ teacherId: teacher, studentId: s2, dsaCourse: courseLean });
  assert(perfS2.summary.totalAssessments === 11, 'S2 totalAssessments === 11 (not incorrectly limited to 10)');
  assert(perfS2.recentAssessments.length === 10, 'S2 recentAssessments length === 10');
  assert(perfS2.student.status === 'GOOD', 'S2 is GOOD (Activity + No Mastery)');

  // Test S3: KNOWLEDGE_GAP & Orphan ignored & Video Chunk Mapping
  const perfS3 = await getStudentPerformance({ teacherId: teacher, studentId: s3, dsaCourse: courseLean });
  assert(perfS3.student.status === 'LAGGING', 'S3 is LAGGING');
  assert(perfS3.learningGaps.length === 1 && perfS3.learningGaps[0].concept === 'C1', 'S3 has 1 Learning Gap (C1). Orphan ignored.');
  const c1Perf = perfS3.concepts.find(c => c.concept === 'C1');
  assert(c1Perf.referenceSegment && c1Perf.referenceSegment.videoId === 'abcdef12345', 'Video chunk mapped to C1');
  const c2Perf = perfS3.concepts.find(c => c.concept === 'C2');
  assert(!c2Perf.referenceSegment, 'No video chunk for C2');

  // Test S4: AT_RISK
  const perfS4 = await getStudentPerformance({ teacherId: teacher, studentId: s4, dsaCourse: courseLean });
  assert(perfS4.student.status === 'AT_RISK', 'S4 is AT_RISK (2 Knowledge Gaps)');

  // Test S5: DISENGAGED_GUESSING
  const perfS5 = await getStudentPerformance({ teacherId: teacher, studentId: s5, dsaCourse: courseLean });
  assert(perfS5.student.status === 'LAGGING', 'S5 is LAGGING (Disengaged Guessing affects status)');
  assert(perfS5.learningGaps.length === 0, 'S5 Learning Gaps is empty (Disengaged Guessing does not appear here)');
  const s5C1 = perfS5.concepts.find(c => c.concept === 'C1');
  assert(s5C1.status === 'DISENGAGED_GUESSING', 'S5 C1 status is DISENGAGED_GUESSING in concept table');

  // Test S6 & S7: DEVELOPING & INSUFFICIENT_DATA
  const perfS6 = await getStudentPerformance({ teacherId: teacher, studentId: s6, dsaCourse: courseLean });
  assert(perfS6.learningGaps.length === 0, 'DEVELOPING does not affect gap count');
  assert(perfS6.summary.assessedConcepts === 1, 'DEVELOPING counts as assessed concept');

  const perfS7 = await getStudentPerformance({ teacherId: teacher, studentId: s7, dsaCourse: courseLean });
  assert(perfS7.learningGaps.length === 0, 'INSUFFICIENT_DATA does not affect gap count');
  assert(perfS7.summary.assessedConcepts === 0, 'INSUFFICIENT_DATA does not count as assessed concept');

  // DTO purity checks
  assert(!perfS3.student.passwordHash, 'No passwordHash in DTO');
  assert(!perfS3.recentAssessments[0].answers, 'No raw QuizAttempt answers in DTO');
  assert(!perfS3.concepts[0].conceptMastery, 'No raw ConceptMastery in DTO');

  // Cleanup
  await User.deleteMany({ name: { $regex: '^' + testPrefix } });
  await Course.deleteMany({ title: testPrefix + 'DSA' });
  await QuizAttempt.deleteMany({ student: { $in: [s1, s2, s3, s4, s5, s6, s7, sOther] } });
  await ConceptMastery.deleteMany({ student: { $in: [s1, s2, s3, s4, s5, s6, s7, sOther] } });

  await mongoose.disconnect();
  process.exit(pass ? 0 : 1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
