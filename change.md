# Lacer AI — Change Log

## 1. Syllabus PDF Upload & Extraction
- **PDF Upload**: Updated `/teacher/course/setup` to accept a `.pdf` file upload using `multipart/form-data` instead of a plain text area.
- **Server-Side Extraction**: Created `lib/parsePdf.js` to extract raw text from the uploaded PDF using the pre-existing `pdf-parse` (v2.4.5) dependency.
- **Security & Validation**: Enforces strict server-side validation including a 5MB size limit, `.pdf` extension check, `%PDF` magic byte verification, and minimum text length checks.
- **In-Memory Processing**: Binary PDF data is processed entirely in memory; no files are saved to disk and raw binary data is never stored in MongoDB.
- **Metadata Persistence**: Only lightweight file metadata (original name, size in bytes, and upload timestamp) and the extracted text are saved to the `Course` model.

## 2. Gemini 2.5 Flash Processing (Curriculum & Teaching Plan)
- **Model Consistency**: Maintained the use of `gemini-2.5-flash` via the `@google/generative-ai` SDK.
- **Source of Truth**: Gemini explicitly uses the extracted PDF syllabus text as the authoritative source for generating the curriculum.
- **Teaching Plan Generation**: Expanded the `COURSE_SCHEMA` in `lib/gemini.js` to prompt Gemini to generate a daily `teachingPlan` in addition to the `levels` and `concepts`.
- **Teaching Plan Structure**: The teaching plan contains the `day` number, an array of `topics`, a concise `objective`, and `estimatedMinutes` per day.
- **Validation**: Augmented the server-side `validateCourseOutput` function to strictly validate the presence and structure of the new `teachingPlan` array before persistence.

## 3. YouTube Reference Retention
- **Dual Inputs Preserved**: The course setup flow explicitly requires both the Syllabus PDF (for curriculum/plan generation) and the YouTube URL (for reference).
- **Clear Distinction**: The UI explicitly clarifies that the syllabus drives AI generation, while the YouTube URL is saved as metadata for future chunking/reference.
- **No False Claims**: The YouTube URL is correctly persisted, but the video's transcript/content is **not** ingested or processed by Gemini in this iteration.

## 4. Course Data Model Updates
- **`syllabusFileMeta`**: Added to `models/Course.js` to store PDF metadata (originalName, sizeBytes, uploadedAt).
- **`teachingPlan`**: Added to store the AI-generated day-by-day lesson plan.
- **`youtubeUrl`**: Remained untouched and properly validated.
- **Reusability**: Extended the existing `Course` model safely without creating duplicate collections or breaking the existing `status` or `generatedStructure` architecture.

## 5. Teacher UI & Workflow
- **Setup UI (`/teacher/course/setup`)**: Converted the form to use `FormData`, added a file input for the PDF, and updated user guidance to explain the dual inputs.
- **Review UI (`/teacher/course/review`)**: Implemented a tabbed interface separating the "Curriculum Structure" and the "Daily Teaching Plan".
- **Source Transparency**: The review page explicitly displays the original PDF filename as the source for the generated output, alongside a clickable link to the reference YouTube video.
- **Retry Mechanism**: Uploading a new PDF or changing the YouTube URL correctly resets the course status to `draft`.

## 6. API Route Changes
- **`POST /api/teacher/course`**: Replaced JSON parsing with `request.formData()`. Processes the PDF via `extractPdfText`, validates the YouTube URL, and safely upserts the `Course` document.
- **Endpoint Reuse**: Successfully retained and reused the existing `/process` and `/confirm` endpoints without modification (other than the enhanced output from `lib/gemini.js`).

## 7. Security & Environment
- **Server-Only Extraction**: File reading and text extraction happens strictly server-side.
- **Safe Next.js Body Parsing**: Relied on native Next.js App Router `formData()` handling.
- **No New Secrets**: The existing server-side `GEMINI_API_KEY` is safely reused.

## 8. Verification & Testing
- **Lint**: `npm run lint` — PASS
- **Production Build**: `npm run build` — PASS
- **Gemini Runtime Test**: `node scripts/test-gemini.mjs` — PASS (Verified `gemini-2.5-flash` successfully generates BOTH the 3-level curriculum and the 9-day teaching plan from a test syllabus within ~16.2s, proving the new schema works flawlessly).
- **Git State**: `git diff --check` passed.

## 9. Dependencies Added
- **None**: Reused the existing `@google/generative-ai` and `pdf-parse` libraries. No new dependencies were added to `package.json`.

## 10. Files Added / Updated By This Work
- `models/Course.js` (Modified schema for `teachingPlan` and `syllabusFileMeta`)
- `lib/parsePdf.js` (NEW utility for safe server-side PDF extraction)
- `lib/gemini.js` (Modified `COURSE_SCHEMA` and system prompt for teaching plan)
- `app/api/teacher/course/route.js` (Modified to accept `multipart/form-data`)
- `app/teacher/course/setup/CourseSetupForm.js` (Modified UI for PDF upload)
- `app/teacher/course/review/CourseReview.js` (Modified UI for tabbed teaching plan review)
- `scripts/test-gemini.mjs` (Modified E2E test for the new dual-schema output)


## 11. Teacher Concept Progression (Teach → Unlock)

### 11a. Course Schema: `progression` array
- **Added** `Course.progression` — an embedded array tracking which conceptOrders have been marked taught, per levelOrder.
- Shape: `[{ levelOrder: Number, completedConceptOrders: [Number], updatedAt: Date }]`
- No separate `Level` model or collection. `Course.generatedStructure` remains the canonical curriculum.
- Student unlock status is **never stored** — it is **derived dynamically** from this array.

### 11b. Model migration: `level` → `levelOrder`
Replaced the dangling `level: ObjectId ref:'Level'` field in four models with `levelOrder: Number`. No Level collection was ever created, so these were dead references.

| Model | Change |
|---|---|
| `models/Quiz.js` | `level: ref:'Level'` → `levelOrder: Number`; unique index updated to `{ course, levelOrder, serialNumber }` |
| `models/QuizAttempt.js` | `level: ref:'Level'` → `levelOrder: Number`; analytics index `{ student, course, levelOrder }` added |
| `models/Assignment.js` | `level: ref:'Level'` → `levelOrder: Number`; unique index updated to `{ course, levelOrder }` |
| `models/AssignmentAttempt.js` | `level: ref:'Level'` → `levelOrder: Number` |

### 11c. Route fix: `app/api/student/quiz/submit/route.js`
- Updated the only usage of `quiz.level` → `quiz.levelOrder` to match the new model field.

### 11d. New pure helper library: `lib/progression.js`
Three pure functions — no DB, no side effects:
- `getLevelTeacherStatus(level, progression)` → `'not_started' | 'in_progress' | 'taught'`
- `isLevelUnlockedForStudents(levels, progression, levelOrder)` → `boolean`
- `buildProgressionMap(levels, progression)` → full status map keyed by levelOrder

### 11e. New API: `GET /api/teacher/course/progression`
- Returns `{ progressionMap }` — full derived state for all levels.
- Validates: authenticated teacher, course owned by teacher, course status = `ready`.

### 11f. New API: `PATCH /api/teacher/course/progression`
Body: `{ levelOrder: number, conceptOrder: number, completed: boolean }`
- **Validates every input against `Course.generatedStructure`** — refuses unknown levels or concept orders.
- Uses MongoDB `$addToSet` / `$pull` for idempotent, atomic updates.
- Returns the updated `progressionMap` in response.
- Security: teacher ownership verified server-side; client cannot set its own role.

### 11g. New UI component: `app/teacher/course/review/ProgressionTab.js`
- Displays all curriculum levels and concepts as toggle switches.
- Optimistic UI update on toggle — reverts on API error.
- Shows derived student lock/unlock status per level.
- Loads progression state on mount via the GET endpoint.

### 11h. CourseReview UI updates
- Added "Classroom Progression" tab — visible only after the course structure has been confirmed.
- Tab defaults to "Classroom Progression" for already-confirmed courses.

### 11i. Tests: `scripts/test-progression.mjs`
- 17 unit tests for `lib/progression.js` pure helpers.
- Zero DB dependency — runs with `node scripts/test-progression.mjs`.
- Covers: `not_started`, `in_progress`, `taught`, Level 1 unlock, Level N prerequisite, edge cases (empty level, out-of-range levelOrder, idempotency).

## 12. Verification & Testing (Progression Cycle)
- **Unit tests**: `node scripts/test-progression.mjs` — **17/17 PASS**
- **ESLint**: All 10 changed files — **exit code 0, zero warnings**
- **Production build**: Running (`npm run build`)

## 13. Files Added / Updated (Progression Cycle)

**Modified:**
- `models/Course.js` — Added `progression` embedded array
- `models/Quiz.js` — `level` → `levelOrder`, updated index
- `models/QuizAttempt.js` — `level` → `levelOrder`, added analytics index
- `models/Assignment.js` — `level` → `levelOrder`, updated unique index
- `models/AssignmentAttempt.js` — `level` → `levelOrder`
- `app/api/student/quiz/submit/route.js` — `quiz.level` → `quiz.levelOrder`
- `app/teacher/course/review/CourseReview.js` — Added Progression tab

**New:**
- `lib/progression.js` — Pure progression helper functions
- `app/api/teacher/course/progression/route.js` — GET + PATCH API
- `app/teacher/course/review/ProgressionTab.js` — Concept toggle UI
- `scripts/test-progression.mjs` — Unit test suite

## 14. Remaining Scope (Not Yet Implemented)
- YouTube transcript/content ingestion.
- Quiz generation from syllabus content.
- Student dashboard and roadmap (reads `Course.progression` for unlock state).
- Student quiz and assignment attempts.
- Concept-level mastery calculation.
- Adaptive difficulty / personalized recommendations.
- Teacher class-level analytics and individual student views.
