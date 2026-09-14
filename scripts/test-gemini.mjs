/**
 * scripts/test-gemini.mjs
 *
 * End-to-end test for:
 * - @google/generative-ai@0.24.1 + gemini-2.5-flash + responseSchema
 * - Verifies the model accepts the request and returns a valid structure,
 *   including BOTH the levels/concepts AND the daily teaching plan.
 *
 * Usage: node scripts/test-gemini.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually.
function loadEnv() {
  try {
    const lines = readFileSync(resolve(process.cwd(), '.env'), 'utf-8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim();
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch { /* env already set */ }
}

loadEnv();

const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}

const COURSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    levels: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          order: { type: SchemaType.INTEGER },
          concepts: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                order: { type: SchemaType.INTEGER },
                learningObjectives: {
                  type: SchemaType.ARRAY,
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
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.INTEGER },
          topics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          objective: { type: SchemaType.STRING },
          estimatedMinutes: { type: SchemaType.INTEGER },
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

const TEST_SYLLABUS = `
Unit 1: Arrays and Strings
- Array declaration and initialization
- Array traversal, search, and sort
- Two-pointer technique
- Sliding window
- String manipulation and common patterns

Unit 2: Linked Lists
- Singly linked list: insertion, deletion, traversal
- Doubly linked list
- Fast and slow pointer technique
- Reversing a linked list

Unit 3: Stacks and Queues
- Stack implementation (array and linked list)
- Queue implementation
- Applications: balanced parentheses, next greater element
- Monotonic stack
`;

console.log('Testing Gemini 2.5 Flash with Curriculum + Teaching Plan responseSchema...');
console.log('Model: gemini-2.5-flash');
console.log('SDK version: @google/generative-ai@0.24.1\n');

const client = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = client.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: COURSE_SCHEMA,
  },
});

const start = Date.now();
let result;
try {
  result = await model.generateContent(
    `Course: Data Structures & Algorithms\nSyllabus:\n${TEST_SYLLABUS}`
  );
} catch (err) {
  console.error('FAIL — generateContent threw:', err.message);
  process.exit(1);
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
const text = result.response.text();

let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  console.error('FAIL — Response is not valid JSON:\n', text.slice(0, 500));
  process.exit(1);
}

// Validate structure.
if (!Array.isArray(parsed.levels) || parsed.levels.length === 0) {
  console.error('FAIL — levels is not a non-empty array:', parsed);
  process.exit(1);
}
if (!Array.isArray(parsed.teachingPlan) || parsed.teachingPlan.length === 0) {
  console.error('FAIL — teachingPlan is not a non-empty array:', parsed);
  process.exit(1);
}

console.log(`✓ Gemini 2.5 Flash responded in ${elapsed}s`);
console.log(`✓ responseSchema accepted by API`);
console.log(`✓ Response is valid JSON`);
console.log(`✓ Structure valid: ${parsed.levels.length} levels, ${parsed.teachingPlan.length} teaching days\n`);

let totalConcepts = 0;
for (const level of parsed.levels) {
  console.log(`  Level ${level.order}: "${level.title}" — ${level.concepts.length} concepts`);
  totalConcepts += level.concepts.length;
}
console.log(`✓ Total concepts: ${totalConcepts}\n`);

console.log('  Teaching Plan:');
for (const day of parsed.teachingPlan) {
  console.log(`  Day ${day.day} (${day.estimatedMinutes}m): ${day.objective}`);
}

console.log('\n🟢 PASS — Gemini 2.5 Flash + responseSchema + @google/generative-ai@0.24.1 all compatible\n');
