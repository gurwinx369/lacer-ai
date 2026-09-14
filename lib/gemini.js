import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Fail fast at call time, not at module load, to avoid Next.js build errors.
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Response schema — native structured JSON via Gemini 2.5 Flash + responseSchema
// Produces BOTH the curriculum levels/concepts AND the daily teaching plan.
// ─────────────────────────────────────────────────────────────────────────────
const COURSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    levels: {
      type: SchemaType.ARRAY,
      description: 'Ordered list of learning levels in the course',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title:       { type: SchemaType.STRING,  description: 'Level title' },
          description: { type: SchemaType.STRING,  description: 'Brief level description' },
          order:       { type: SchemaType.INTEGER, description: 'Level order (1-based)' },
          concepts: {
            type: SchemaType.ARRAY,
            description: 'Concepts taught within this level',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title:       { type: SchemaType.STRING,  description: 'Concept title' },
                description: { type: SchemaType.STRING,  description: 'Brief concept description' },
                order:       { type: SchemaType.INTEGER, description: 'Concept order within the level (1-based)' },
                learningObjectives: {
                  type: SchemaType.ARRAY,
                  description: 'What a student should be able to do after this concept',
                  items: { type: SchemaType.STRING },
                },
              },
              required: ['title', 'description', 'order', 'learningObjectives'],
            },
          },
        },
        required: ['title', 'description', 'order', 'concepts'],
      },
    },
    teachingPlan: {
      type: SchemaType.ARRAY,
      description: 'Day-by-day teaching plan grounded in the generated curriculum',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day:              { type: SchemaType.INTEGER, description: 'Teaching day number (1-based)' },
          topics:           { type: SchemaType.ARRAY,   description: 'Concept titles to cover this day', items: { type: SchemaType.STRING } },
          objective:        { type: SchemaType.STRING,  description: 'Concise teaching objective or focus for this day' },
          estimatedMinutes: { type: SchemaType.INTEGER, description: 'Approximate time in minutes for this day\'s content' },
        },
        required: ['day', 'topics', 'objective', 'estimatedMinutes'],
      },
    },
  },
  required: ['levels', 'teachingPlan'],
};

const SYSTEM_PROMPT = `You are an expert curriculum designer for computer science education.
Your task is to analyze a teacher-provided course syllabus (extracted from a PDF) and generate:
1. A structured, ordered learning hierarchy (levels and concepts).
2. A day-by-day teaching plan grounded in that hierarchy.

Rules for curriculum:
- Use the supplied syllabus as the PRIMARY structural source. Do not invent topics not in the syllabus.
- Organize content into coherent learning LEVELS (e.g., Arrays, Linked Lists, Trees).
- Break each level into discrete, teachable CONCEPTS (e.g., Array Declaration, Traversal, Two Pointers).
- Concepts within a level should be non-overlapping.
- Maintain strict prerequisite order: foundational content first.
- Write concise, informative descriptions for each level and concept.
- Generate 2-4 clear learning objectives per concept (what a student will be able to DO).
- Do NOT generate quiz questions, answers, or explanations.
- Do NOT include topics outside the provided syllabus scope.

Rules for teaching plan:
- Each day should reference concept titles that actually appear in the generated curriculum.
- Distribute concepts logically — do not cram too many into a single day.
- Write a concise objective for each day that explains the teaching focus.
- Estimate time in minutes based on concept complexity (typically 45–120 minutes per day).
- The plan must cover ALL concepts from the curriculum.
- Do NOT invent days for topics not in the curriculum.

The reference YouTube video URL is provided as context for scope only; you cannot access its content.`;

/**
 * Calls Gemini 2.5 Flash to generate a structured DSA course hierarchy
 * AND a daily teaching plan from the extracted syllabus text.
 *
 * Uses native responseSchema for guaranteed JSON output — no manual parsing.
 * The syllabus is the authoritative source; YouTube URL is reference metadata only.
 *
 * @param {string} syllabus    - Extracted text from teacher's uploaded PDF
 * @param {string} youtubeUrl  - Reference video URL (scope context only, not fetched)
 * @param {string} courseTitle - e.g. "Data Structures & Algorithms"
 * @returns {Promise<{ levels: Array, teachingPlan: Array }>}
 * @throws {Error} On API failure, missing key, or invalid structure
 */
export async function generateCourseStructure(syllabus, youtubeUrl, courseTitle) {
  const client = getGeminiClient();

  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: COURSE_SCHEMA,
    },
  });

  const userPrompt = `Course title: ${courseTitle}

Reference YouTube video (for scope context only — you cannot access this URL):
${youtubeUrl || 'Not provided'}

Teacher-provided syllabus (extracted from uploaded PDF):
---
${syllabus}
---

Generate the complete structured learning hierarchy AND a day-by-day teaching plan based on the syllabus above.`;

  let result;
  try {
    result = await model.generateContent(userPrompt);
  } catch (err) {
    // Sanitize — never expose raw API error which may contain key info.
    console.error('[gemini] generateContent failed:', err.message);
    throw new Error('Gemini API call failed. Please try again.');
  }

  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('[gemini] Response was not valid JSON:', text?.slice(0, 200));
    throw new Error('Gemini returned malformed output. Please try again.');
  }

  // Validate structure before returning — never trust raw AI output.
  validateCourseOutput(parsed);

  return parsed;
}

/**
 * Validates the full Gemini-generated output (levels + teachingPlan).
 * Throws a descriptive Error if invalid or malformed.
 * @param {unknown} data
 */
function validateCourseOutput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Generated output is not a valid object.');
  }

  // ── Levels validation ──────────────────────────────────────────────────────
  if (!Array.isArray(data.levels) || data.levels.length === 0) {
    throw new Error('Generated structure must contain a non-empty levels array.');
  }

  for (const [li, level] of data.levels.entries()) {
    if (!level.title || typeof level.title !== 'string' || !level.title.trim()) {
      throw new Error(`Level ${li + 1} is missing a valid title.`);
    }
    if (typeof level.order !== 'number' && typeof level.order !== 'string') {
      throw new Error(`Level "${level.title}" is missing a valid order.`);
    }
    if (!Array.isArray(level.concepts) || level.concepts.length === 0) {
      throw new Error(`Level "${level.title}" must contain at least one concept.`);
    }
    for (const [ci, concept] of level.concepts.entries()) {
      if (!concept.title || typeof concept.title !== 'string' || !concept.title.trim()) {
        throw new Error(`Concept ${ci + 1} in level "${level.title}" is missing a valid title.`);
      }
      if (!Array.isArray(concept.learningObjectives) || concept.learningObjectives.length === 0) {
        throw new Error(`Concept "${concept.title}" must contain at least one learning objective.`);
      }
    }
  }

  // ── Teaching plan validation ───────────────────────────────────────────────
  if (!Array.isArray(data.teachingPlan) || data.teachingPlan.length === 0) {
    throw new Error('Generated output must contain a non-empty teachingPlan array.');
  }

  for (const [di, day] of data.teachingPlan.entries()) {
    if (typeof day.day !== 'number' && typeof day.day !== 'string') {
      throw new Error(`Teaching plan entry ${di + 1} is missing a valid day number.`);
    }
    if (!Array.isArray(day.topics) || day.topics.length === 0) {
      throw new Error(`Teaching plan day ${day.day} must list at least one topic.`);
    }
    if (!day.objective || typeof day.objective !== 'string' || !day.objective.trim()) {
      throw new Error(`Teaching plan day ${day.day} is missing a valid objective.`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz generation
// ─────────────────────────────────────────────────────────────────────────────

const QUIZ_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    quizzes: {
      type: SchemaType.ARRAY,
      description: 'Exactly 5 quizzes for the level',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          serialNumber: { type: SchemaType.INTEGER, description: 'Quiz serial number from 1 to 5' },
          title: { type: SchemaType.STRING, description: 'Title of the quiz' },
          questions: {
            type: SchemaType.ARRAY,
            description: 'List of questions for this quiz',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                serialNumber: { type: SchemaType.INTEGER, description: 'Unique question serial number within this quiz' },
                question: { type: SchemaType.STRING, description: 'The question text' },
                options: {
                  type: SchemaType.ARRAY,
                  description: 'Exactly 3 options for the answer',
                  items: { type: SchemaType.STRING },
                },
                correctAnswer: { type: SchemaType.INTEGER, description: '0-based index of the correct option (0, 1, or 2)' },
                conceptOrder: { type: SchemaType.INTEGER, description: 'The order number of the concept this question tests' },
                difficulty: { type: SchemaType.STRING, description: 'Difficulty level: "easy", "medium", or "hard"' },
              },
              required: ['serialNumber', 'question', 'options', 'correctAnswer', 'conceptOrder', 'difficulty'],
            },
          },
        },
        required: ['serialNumber', 'title', 'questions'],
      },
    },
  },
  required: ['quizzes'],
};

const QUIZ_SYSTEM_PROMPT = `You are an expert computer science educator.
Your task is to generate assessment quizzes for a specific learning level in a Data Structures & Algorithms course.

Rules:
- Generate EXACTLY 5 quizzes.
- Each quiz must contain a meaningful set of questions (e.g. 3-5 questions per quiz).
- Provide EXACTLY 3 options for each question.
- Indicate the correct answer using a 0-based index (0, 1, or 2).
- Ground all questions ONLY in the supplied canonical level curriculum concepts. Do NOT invent concepts.
- Provide the \`conceptOrder\` for each question corresponding to the canonical concept it tests.
- Set difficulty to "easy", "medium", or "hard".
- Do not duplicate questions. Avoid trivial wording changes.
- Ensure questions are clear, unambiguous, and have only one defensible answer.`;

/**
 * Generates exactly 5 quizzes for a specific level.
 * @param {string} courseTitle - The course title.
 * @param {string} levelTitle - The title of the level.
 * @param {Array<{title: string, description: string, order: number, learningObjectives: string[]}>} concepts - Canonical concepts for the level.
 * @returns {Promise<{ quizzes: Array }>}
 */
export async function generateQuizzesForLevel(courseTitle, levelTitle, concepts) {
  const client = getGeminiClient();

  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: QUIZ_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: QUIZ_SCHEMA,
    },
  });

  const conceptsText = concepts.map(c =>
    `Concept ${c.order}: ${c.title}\nDescription: ${c.description}\nObjectives: ${c.learningObjectives?.join(', ') || ''}`
  ).join('\n\n');

  const userPrompt = `Course: ${courseTitle}
Level: ${levelTitle}

Canonical Concepts to test:
---
${conceptsText}
---

Generate exactly 5 quizzes for this level based ONLY on the concepts provided above. Ensure each question references the correct \`conceptOrder\`.`;

  let result;
  try {
    result = await model.generateContent(userPrompt);
  } catch (err) {
    console.error('[gemini] quiz generateContent failed:', err.message);
    throw new Error('Gemini API call failed during quiz generation.');
  }

  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('[gemini] Quiz response was not valid JSON:', text?.slice(0, 200));
    throw new Error('Gemini returned malformed quiz output.');
  }

  validateQuizOutput(parsed, concepts);

  return parsed;
}

function validateQuizOutput(data, concepts) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.quizzes)) {
    throw new Error('Generated output must contain a quizzes array.');
  }
  if (data.quizzes.length !== 5) {
    throw new Error(`Expected exactly 5 quizzes, got ${data.quizzes.length}.`);
  }

  const validConceptOrders = new Set(concepts.map(c => c.order));

  for (const [qi, quiz] of data.quizzes.entries()) {
    if (quiz.serialNumber !== qi + 1) {
      throw new Error(`Quiz ${qi + 1} has invalid serialNumber ${quiz.serialNumber}.`);
    }
    if (!quiz.title || typeof quiz.title !== 'string') {
      throw new Error(`Quiz ${qi + 1} is missing a valid title.`);
    }
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error(`Quiz ${qi + 1} must have at least one question.`);
    }
    if (quiz.questions.length < 3 || quiz.questions.length > 5) {
      throw new Error(`Quiz ${qi + 1} must contain between 3 and 5 questions.`);
    }

    const seenQSerials = new Set();
    const seenQuestionsText = new Set();

    for (const [qidx, q] of quiz.questions.entries()) {
      if (seenQSerials.has(q.serialNumber)) {
        throw new Error(`Duplicate question serialNumber ${q.serialNumber} in quiz ${qi + 1}.`);
      }
      seenQSerials.add(q.serialNumber);

      const qText = q.question?.trim()?.toLowerCase();
      if (!qText) {
        throw new Error(`Question ${qidx + 1} in quiz ${qi + 1} has empty text.`);
      }
      if (seenQuestionsText.has(qText)) {
         throw new Error(`Duplicate question text in quiz ${qi + 1}.`);
      }
      seenQuestionsText.add(qText);

      if (!Array.isArray(q.options) || q.options.length !== 3) {
        throw new Error(`Question ${qidx + 1} in quiz ${qi + 1} must have exactly 3 options.`);
      }
      if (q.options.some(o => typeof o !== 'string' || !o.trim())) {
         throw new Error(`Question ${qidx + 1} in quiz ${qi + 1} has empty options.`);
      }

      if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 2) {
        throw new Error(`Question ${qidx + 1} in quiz ${qi + 1} has invalid correctAnswer ${q.correctAnswer}.`);
      }
      if (!validConceptOrders.has(q.conceptOrder)) {
        throw new Error(`Question ${qidx + 1} in quiz ${qi + 1} references invalid conceptOrder ${q.conceptOrder}.`);
      }
      if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
         throw new Error(`Question ${qidx + 1} in quiz ${qi + 1} has invalid difficulty ${q.difficulty}.`);
      }
    }
  }
}
