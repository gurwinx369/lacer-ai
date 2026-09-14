# Lacer AI — Change Log

## 1. Teacher Authentication
- **Separate teacher login route/page**: Implemented dedicated `/teacher/login` routes and UI to distinctly separate teacher and student authentication flows.
- **Email/password authentication**: Standard credential-based login is securely supported.
- **Shared User model**: Created a Mongoose model (`models/User.js`) supporting both `teacher` and `student` roles, preventing the need for separate schemas.
- **Password hashing**: Integrated `bcryptjs` for secure password storage and verification.
- **Server-side session verification**: Validated credentials generate a stateless JWT signed with `jose`.
- **HTTP-only authentication cookie**: JWT is stored securely as an `HttpOnly` cookie to prevent XSS leakage.
- **Server-side role enforcement**: Protected routes natively verify `role === 'teacher'` to ensure students cannot access teacher resources.
- **Teacher logout**: Provided an endpoint to clear the authentication cookie securely.
- **Protected teacher dashboard**: The `/teacher/dashboard` route mandates a valid teacher session.
- **Student login foundation**: Created stub endpoints and UI for the student login to demonstrate structural readiness without implementing the full flow.
- **MongoDB-backed user authentication**: All authentication verifies directly against the persistent MongoDB user store.

## 2. MongoDB / Database Foundation
- **Mongoose/MongoDB connection**: Established the primary database connection lifecycle in `lib/db.js`.
- **Reusable database connection handling**: Designed a cached connection instance tailored to avoid connection exhaustion during Next.js Hot Module Replacement (HMR).
- **User model integration**: Connected authentication logic to `models/User.js`.
- **Course model integration**: Wired DSA course operations to `models/Course.js`.
- **Unique Indexes**: Implemented strict compound uniqueness at the database index layer for user emails and teacher-course ownership.

## 3. Teacher Dashboard
- **Protected teacher dashboard**: The dashboard shell and page require strict role-based authentication.
- **Class overview metrics**: Displays total students, lagging students, and good-standing students.
- **Real database query**: `Total Students` queries real data from the `User` collection.
- **Zero/empty states**: Lagging and good-standing metrics display zero states intelligently, waiting for future mastery and assessment data integration.
- **DSA course status displayed**: Provides real-time visual feedback on the state of the DSA course (Draft, Processing, Ready, Confirmed, Failed).
- **Course setup/review actions**: Contextual action buttons dynamically route teachers to `/teacher/course/setup` or `/teacher/course/review` depending on the active course state.

## 4. Gemini 2.5 Flash Integration
- **Existing SDK**: Utilized the pre-installed `@google/generative-ai` package.
- **Model**: Connected exclusively to the `gemini-2.5-flash` model for processing.
- **Server-side Execution**: Guaranteed that all Gemini generation occurs exclusively on the backend.
- **Processing Logic**: Gemini parses teacher-provided DSA syllabus text to extract educational structures.
- **Structured JSON output**: Relied on the Gemini SDK's `responseSchema` to natively guarantee structured JSON instead of brittle prompt-based parsing.
- **Generated DSA learning structure**: Outputs a standardized hierarchy mapping Levels to Concepts to Learning Objectives.
- **Validation**: Strict server-side verification runs against the generated AI output to prevent malformed data from entering the database.
- **Runtime Verification**: Proved that Gemini 2.5 Flash successfully accepts requests, respects `responseSchema`, and returns valid JSON. The E2E test generated 5 levels and 20 concepts from a test syllabus with a ~24.8s latency.

## 5. DSA Course Setup Flow
Files implemented for this flow:
- `/teacher/course/setup`
- `/teacher/course/review`
- `/api/teacher/course`
- `/api/teacher/course/process`
- `/api/teacher/course/confirm`

**Workflow:**
The teacher provides the DSA syllabus and reference video → Saves the course setup → Triggers Gemini processing → Gemini generates structured levels and concepts → The teacher reviews the generated structure → The teacher confirms the structure → The dashboard reflects the course state.

**Limitation on YouTube:**
The provided YouTube URL is stored strictly as course metadata. The current Gemini SDK version lacks native support for ingesting arbitrary YouTube URLs. Therefore, the implementation does not ingest, extract, or scrape the YouTube video transcript. The AI processes only the syllabus text.

## 6. Course Processing State
- **draft**: The initial state when a teacher provides a syllabus and URL but has not yet triggered processing, or when processing failed and setup was resumed.
- **processing**: The active state indicating that the Gemini API is currently analyzing the syllabus.
- **ready**: The state indicating that Gemini successfully returned valid structural JSON, waiting for teacher confirmation.
- **failed**: Indicates an error occurred during AI generation or validation, presenting the error message to the user.

Failed setups can be retried. Ready setups can be reviewed and confirmed. Confirmed setups expose the final course structure.

## 7. Course Data Model
Fields and rules strictly implemented in `models/Course.js`:
- **createdBy**: Reference to the teacher who owns the course.
- **slug**: Stable identifier (`dsa`).
- **syllabus**: The reference text driving AI processing.
- **youtubeUrl**: Stored metadata reference.
- **status**: Enum representing the processing lifecycle.
- **generatedStructure**: The validated JSON hierarchy.
- **processingError**: Contextual error message on failure.
- **confirmedAt**: Timestamp recorded when the teacher approves the structure.
- **timestamps**: Standard Mongoose createdAt/updatedAt.
- **Uniqueness**: A compound index on `{ slug: 1, createdBy: 1 }` guarantees only one DSA course per teacher.

## 8. Security / Environment
- **Server-only secrets**: Both `GEMINI_API_KEY` and `AUTH_SECRET` are strictly required on the server side and never exposed to the client.
- **.env isolation**: The `.env` file containing actual keys is explicitly ignored via `.gitignore`.
- **NEXT_PUBLIC exclusion**: No sensitive keys are leaked through Next.js public environment variables.
- **Server-side validation**: All authentication, role checking, and data validations run securely on the server.
- **Sanitized Logging**: Explicitly avoids logging raw error payloads or secrets.

## 9. Verification
- **Lint**: `npm run lint` — PASS
- **Production Build**: `npm run build` — PASS
- **Gemini Runtime Test**: `node scripts/test-gemini.mjs` — PASS (Tested Gemini 2.5 Flash, responseSchema, valid JSON, 5 levels, 20 concepts, ~24.8s response time).
- **Git Integration**: Stashed current Gemini work, successfully pulled latest `feature/backend` changes via rebase (integrating other developers' work), successfully popped stash with no conflicts, and `git diff --check` passed cleanly.

## 10. Files Added / Updated By This Work
- `models/User.js`
- `models/Course.js`
- `lib/db.js`
- `lib/auth.js`
- `lib/gemini.js`
- `app/api/auth/logout/route.js`
- `app/api/auth/teacher/login/route.js`
- `app/api/auth/student/login/route.js`
- `app/api/teacher/course/route.js`
- `app/api/teacher/course/process/route.js`
- `app/api/teacher/course/confirm/route.js`
- `app/teacher/dashboard/page.js`
- `app/teacher/dashboard/DashboardShell.js`
- `app/teacher/login/page.js`
- `app/teacher/login/TeacherLoginForm.js`
- `app/student/login/page.js`
- `app/student/login/StudentLoginForm.js`
- `app/teacher/course/setup/page.js`
- `app/teacher/course/setup/CourseSetupForm.js`
- `app/teacher/course/review/page.js`
- `app/teacher/course/review/CourseReview.js`
- `scripts/seed-teacher.mjs`
- `scripts/test-gemini.mjs`

## 11. Current Scope / Not Yet Implemented
The following features are conceptually part of Lacer AI but are NOT implemented in the current repository:
- YouTube transcript/content ingestion.
- Automatic YouTube video chunk extraction.
- Quiz generation from video transcripts.
- Student dashboard/roadmap.
- Student quiz attempts.
- Assignment attempts.
- Student mastery calculation.
- Concept-level learning-gap analytics.
- Adaptive difficulty.
- Personalized recommendations.
- Teacher concept completion/unlocking workflow.
