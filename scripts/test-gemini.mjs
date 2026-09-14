/**
 * scripts/test-gemini.mjs
 *
 * End-to-end test for:
 * - @google/generative-ai@0.24.1 + gemini-2.5-flash + responseSchema
 * - Verifies the model accepts the request and returns a valid structure
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

const SCHEMA = {
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
  },
  required: ['levels'],
};

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

Unit 4: Trees
- Binary tree traversal (in-order, pre-order, post-order)
- Binary Search Trees (BST)
- Heap and Priority Queue
- Trie basics

Unit 5: Graphs
- Graph representation (adjacency list/matrix)
- BFS and DFS
- Topological sort
- Shortest path: Dijkstra
`;

console.log('Testing Gemini 2.5 Flash with responseSchema...');
console.log('Model: gemini-2.5-flash');
console.log('SDK version: @google/generative-ai@0.24.1\n');

const client = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = client.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: 'You are an expert curriculum designer. Generate a structured DSA course hierarchy strictly in JSON.',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: SCHEMA,
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

for (const level of parsed.levels) {
  if (!level.title || typeof level.order !== 'number') {
    console.error('FAIL — level missing title or order:', level);
    process.exit(1);
  }
  if (!Array.isArray(level.concepts) || level.concepts.length === 0) {
    console.error('FAIL — level has no concepts:', level.title);
    process.exit(1);
  }
  for (const concept of level.concepts) {
    if (!concept.title || !Array.isArray(concept.learningObjectives) || concept.learningObjectives.length === 0) {
      console.error('FAIL — concept invalid:', concept);
      process.exit(1);
    }
  }
}

console.log(`✓ Gemini 2.5 Flash responded in ${elapsed}s`);
console.log(`✓ responseSchema accepted by API`);
console.log(`✓ Response is valid JSON`);
console.log(`✓ Structure valid: ${parsed.levels.length} levels`);

let totalConcepts = 0;
for (const level of parsed.levels) {
  console.log(`  Level ${level.order}: "${level.title}" — ${level.concepts.length} concepts`);
  totalConcepts += level.concepts.length;
}
console.log(`✓ Total concepts: ${totalConcepts}`);
console.log('\n🟢 PASS — Gemini 2.5 Flash + responseSchema + @google/generative-ai@0.24.1 all compatible\n');
