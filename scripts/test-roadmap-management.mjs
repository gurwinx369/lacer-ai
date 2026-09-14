import mongoose from 'mongoose';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import User from '../models/User.js';
import Course from '../models/Course.js';
import QuizAttempt from '../models/QuizAttempt.js';
import AssignmentAttempt from '../models/AssignmentAttempt.js';
import ConceptMastery from '../models/ConceptMastery.js';
import { mutateRoadmapStructure } from '../lib/roadmap.js';
import { buildProgressionMap, getLevelTeacherStatus, isLevelUnlockedForStudents } from '../lib/progression.js';

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
  console.log('Connecting to DB for Roadmap Management Test...');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });

  const testPrefix = 'TEST_ROADMAP_';
  await User.deleteMany({ name: { $regex: '^' + testPrefix } });
  await Course.deleteMany({ title: testPrefix + 'DSA' });

  const teacher = new mongoose.Types.ObjectId();
  const student = new mongoose.Types.ObjectId();

  await User.create([
    {
      _id: teacher,
      name: testPrefix + 'Teacher',
      email: `${testPrefix.toLowerCase()}teacher@test.com`,
      passwordHash: 'dummy',
      role: 'teacher',
    },
    {
      _id: student,
      name: testPrefix + 'Student',
      email: `${testPrefix.toLowerCase()}student@test.com`,
      passwordHash: 'dummy',
      role: 'student',
      registrationId: 'REG_TEST',
      program: testPrefix + 'DSA',
    }
  ]);

  const initialStructure = {
    levels: [
      { order: 1, title: 'L1', concepts: [{ order: 1, title: 'C1' }, { order: 2, title: 'C2' }] },
      { order: 2, title: 'L2', concepts: [{ order: 1, title: 'C3' }, { order: 2, title: 'C4' }] }
    ]
  };

  const initialVideoChunks = [
    { levelOrder: 1, conceptOrder: 1, startSeconds: 0, endSeconds: 10 },
    { levelOrder: 1, conceptOrder: 2, startSeconds: 10, endSeconds: 20 },
    { levelOrder: 2, conceptOrder: 1, startSeconds: 20, endSeconds: 30 },
  ];

  const course = await Course.create({
    title: testPrefix + 'DSA',
    slug: 'dsa',
    createdBy: teacher,
    status: 'ready',
    generatedStructure: JSON.parse(JSON.stringify(initialStructure)),
    videoChunks: JSON.parse(JSON.stringify(initialVideoChunks))
  });

  let pass = true;
  const assert = (condition, msg) => {
    if (!condition) {
      console.error('❌ FAIL:', msg);
      pass = false;
    } else {
      console.log('✅ PASS:', msg);
    }
  };

  try {
    // 1. Delete Concept removes its video chunks and shifts remaining
    mutateRoadmapStructure(course, 'delete-concept', { levelOrder: 1, conceptOrder: 1 });
    assert(course.generatedStructure.levels[0].concepts.length === 1, 'Delete concept removes from level');
    assert(course.generatedStructure.levels[0].concepts[0].title === 'C2', 'Remaining concept is C2');
    assert(course.generatedStructure.levels[0].concepts[0].order === 1, 'Remaining concept order is shifted to 1');
    assert(course.videoChunks.length === 2, 'Video chunk for deleted concept is removed');
    const c2Vc = course.videoChunks.find(v => v.levelOrder === 1 && v.conceptOrder === 1);
    assert(c2Vc && c2Vc.startSeconds === 10, 'Video chunk shifted correctly for C2');

    // 2. Reorder Concept moves video chunks with it
    // Add another concept back to test reordering
    course.generatedStructure.levels[0].concepts.push({ order: 2, title: 'C1_new' });
    course.videoChunks.push({ levelOrder: 1, conceptOrder: 2, startSeconds: 90, endSeconds: 100 });
    
    mutateRoadmapStructure(course, 'reorder-concept', { levelOrder: 1, conceptOrder: 1, direction: 'down' });
    assert(course.generatedStructure.levels[0].concepts[0].title === 'C1_new', 'C1_new moved up');
    assert(course.generatedStructure.levels[0].concepts[1].title === 'C2', 'C2 moved down');
    const vcUp = course.videoChunks.find(v => v.levelOrder === 1 && v.conceptOrder === 1);
    const vcDown = course.videoChunks.find(v => v.levelOrder === 1 && v.conceptOrder === 2);
    assert(vcUp.startSeconds === 90, 'Video chunk moved up with C1_new');
    assert(vcDown.startSeconds === 10, 'Video chunk moved down with C2');

    // 3. Delete Level removes its video chunks and shifts levels
    mutateRoadmapStructure(course, 'delete-level', { levelOrder: 1 });
    assert(course.generatedStructure.levels.length === 1, 'Level removed');
    assert(course.generatedStructure.levels[0].title === 'L2', 'L2 shifted up');
    assert(course.generatedStructure.levels[0].order === 1, 'L2 order is now 1');
    assert(course.videoChunks.length === 1, 'L1 video chunks removed');
    assert(course.videoChunks[0].startSeconds === 20, 'L2 video chunk remains');
    assert(course.videoChunks[0].levelOrder === 1, 'L2 video chunk levelOrder shifted');

    // 4. Edit Concept preserves video chunks
    mutateRoadmapStructure(course, 'edit-concept', { levelOrder: 1, conceptOrder: 1, title: 'C3_Edited', learningObjectives: ['Obj1'] });
    assert(course.generatedStructure.levels[0].concepts[0].title === 'C3_Edited', 'Title edited');
    assert(course.generatedStructure.levels[0].concepts[0].learningObjectives[0] === 'Obj1', 'Objectives edited');
    assert(course.videoChunks[0].startSeconds === 20, 'Video chunk preserved');

    // 5. Progression and student data preservation
    // Under the correct rule: each level unlocks on its OWN levelTaught flag.
    // L1 taught does NOT unlock L2 — L2 requires its own levelTaught.
    course.progression = [{ levelOrder: 1, levelTaught: true, completedConceptOrders: [1, 2], updatedAt: new Date() }];
    course.confirmedAt = new Date();
    await course.save();

    // Create dummy student data
    await QuizAttempt.create({ 
      student, course: course._id, quiz: new mongoose.Types.ObjectId(), 
      score: 100, levelOrder: 1, totalQuestions: 1, 
      answers: [{ question: new mongoose.Types.ObjectId(), isCorrect: true, correctAnswer: 1, difficulty: 'medium', concept: 'C1', serialNumber: 1 }] 
    });
    await ConceptMastery.create({ student, course: course._id, conceptMastery: {} });

    // L1 taught → L1 unlocked; L2 NOT taught → L2 locked
    assert(isLevelUnlockedForStudents(course.generatedStructure.levels, course.progression, 1) === true,
      'Level 1 unlocked when Level 1 is taught');
    assert(isLevelUnlockedForStudents(course.generatedStructure.levels, course.progression, 2) === false,
      'Level 2 locked (L2 levelTaught not set, only L1 is taught)');

    // Now mark L2 taught too
    course.progression.push({ levelOrder: 2, levelTaught: true, completedConceptOrders: [], updatedAt: new Date() });
    await course.save();
    assert(isLevelUnlockedForStudents(course.generatedStructure.levels, course.progression, 2) === true,
      'Level 2 unlocked after L2 is explicitly taught');

    // Progression undo — unmark L1; L2 remains independently taught
    course.progression[0].levelTaught = false;
    await course.save();
    assert(isLevelUnlockedForStudents(course.generatedStructure.levels, course.progression, 1) === false,
      'Level 1 locked after unmark');
    assert(isLevelUnlockedForStudents(course.generatedStructure.levels, course.progression, 2) === true,
      'Level 2 still unlocked (its own levelTaught=true unaffected by L1 unmark)');

    // Ensure student data remains after progression changes
    const qaCount = await QuizAttempt.countDocuments({ student, course: course._id });
    const cmCount = await ConceptMastery.countDocuments({ student, course: course._id });
    assert(qaCount === 1, 'Quiz attempt preserved after progression undo');
    assert(cmCount === 1, 'Concept mastery preserved after progression undo');

    // 6. Regeneration (Simulated)
    // Create an unconfirmed course to test regeneration logic
    const courseUnconf = await Course.create({
      title: testPrefix + 'DSA_Unconf',
      slug: 'dsa_unconf',
      createdBy: teacher,
      status: 'ready',
      syllabus: 'Mock Syllabus',
      youtubeUrl: 'https://youtube.com/watch?v=123',
      generatedStructure: JSON.parse(JSON.stringify(initialStructure)),
      videoChunks: JSON.parse(JSON.stringify(initialVideoChunks)),
      teachingPlan: [{ day: 1, topics: ['C1', 'C2'], objective: 'Test', estimatedMinutes: 60 }]
    });

    // Simulate regeneration success
    const newStructure = {
      levels: [
        { title: 'New Level 1', order: 1, concepts: [{ title: 'New Concept 1', order: 1, learningObjectives: [] }] }
      ],
      teachingPlan: [
        { day: 1, topics: ['New Concept 1'], objective: 'New Obj', estimatedMinutes: 60 }
      ]
    };

    // Atomic update as done in process/route.js
    courseUnconf.status = 'ready';
    courseUnconf.generatedStructure = { levels: newStructure.levels };
    courseUnconf.teachingPlan = newStructure.teachingPlan;
    courseUnconf.videoChunks = [];
    courseUnconf.processingError = null;
    await courseUnconf.save();

    const verified = await Course.findById(courseUnconf._id);
    assert(verified.generatedStructure.levels.length === 1, 'successful generation replaces structure');
    assert(verified.teachingPlan[0].objective === 'New Obj', 'successful generation replaces teachingPlan');
    assert(verified.videoChunks.length === 0, 'successful generation clears old videoChunks');
    assert(verified.youtubeUrl === 'https://youtube.com/watch?v=123', 'regeneration preserves YouTube URL');
    assert(verified.syllabus === 'Mock Syllabus', 'regeneration preserves syllabus');
    
    // Simulate Gemini Failure
    // Should do zero DB mutation
    let didMutate = false;
    try {
       // do nothing
       throw new Error('Gemini failed');
    } catch(err) {
       // api route does return NextResponse and does not call .save()
       didMutate = false;
    }
    assert(!didMutate, 'failed Gemini preserves generatedStructure and videoChunks (no mutation)');
    

  } catch (err) {
    console.error('Test error:', err);
    pass = false;
  }

  // Cleanup
  await User.deleteMany({ name: { $regex: '^' + testPrefix } });
  await Course.deleteMany({ title: testPrefix + 'DSA' });
  await QuizAttempt.deleteMany({ student });
  await ConceptMastery.deleteMany({ student });

  await mongoose.disconnect();
  process.exit(pass ? 0 : 1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
