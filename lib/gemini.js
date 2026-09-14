import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Fail fast at call time, not at module load, to avoid Next.js build errors.
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Response schema for native structured JSON output.
// Gemini 2.5 Flash + @google/generative-ai v0.24.1 support responseSchema.
const COURSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    levels: {
      type: SchemaType.ARRAY,
      description: 'Ordered list of learning levels in the course',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: 'Level title' },
          description: { type: SchemaType.STRING, description: 'Brief level description' },
          order: { type: SchemaType.INTEGER, description: 'Level order (1-based)' },
          concepts: {
            type: SchemaType.ARRAY,
            description: 'Concepts taught within this level',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: 'Concept title' },
                description: { type: SchemaType.STRING, description: 'Brief concept description' },
                order: { type: SchemaType.INTEGER, description: 'Concept order within the level (1-based)' },
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
  },
  required: ['levels'],
};

const SYSTEM_PROMPT = `You are an expert curriculum designer for computer science education.
Your task is to analyze a teacher-provided DSA course syllabus and generate a structured, ordered learning hierarchy.

Rules:
- Use the supplied syllabus as the PRIMARY structural source. Do not invent topics not found in the syllabus.
- Organize content into coherent learning LEVELS (e.g., Beginner, Arrays, Linked Lists, Trees, etc.).
- Break each level into discrete, teachable CONCEPTS (e.g., Array Declaration, Traversal, Two Pointers).
- Concepts within a level should be non-overlapping.
- Maintain strict prerequisite order: easier/foundational content first.
- Write concise, informative descriptions for each level and concept.
- Generate 2-4 clear learning objectives per concept (what a student will be able to DO).
- Do NOT generate quiz questions, answers, or explanations.
- Do NOT include topics outside the provided syllabus scope.
- The reference YouTube video URL is provided as context for scope only; you cannot access its content.`;

/**
 * Calls Gemini 2.5 Flash to generate a structured DSA course hierarchy.
 * Uses native responseSchema for guaranteed JSON output — no manual parsing.
 *
 * @param {string} syllabus - Teacher-provided reference syllabus text
 * @param {string} youtubeUrl - Reference video URL (scope context only, not fetched)
 * @param {string} courseTitle - e.g. "Data Structures & Algorithms"
 * @returns {Promise<{ levels: Array }>} Validated course structure
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
${youtubeUrl}

Teacher-provided syllabus:
---
${syllabus}
---

Generate the complete structured learning hierarchy for this course based on the syllabus above.`;

  let result;
  try {
    result = await model.generateContent(userPrompt);
  } catch (err) {
    // Sanitize — never expose the raw API error which may contain key info.
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
  validateCourseStructure(parsed);

  return parsed;
}

/**
 * Validates the Gemini-generated structure.
 * Throws a descriptive Error if the structure is invalid or malformed.
 * @param {unknown} data
 */
function validateCourseStructure(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Generated structure is not a valid object.');
  }

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
}
