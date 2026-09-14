# Lacer AI — AGENTS.md

## Project Overview

Lacer AI is an AI-powered personalized learning and learning-gap detection platform.

The system connects:

- Classroom teaching
- Structured learning levels
- Student assessments
- Concept-level mastery
- Learning-gap detection
- Personalized learning resources
- Adaptive practice
- Teacher analytics

The core product principle is:

 **From Marks to Mastery.**

Lacer AI must identify **which concepts a student understands or struggles with**, rather than relying only on overall marks.

---

## Product Roles

Lacer AI has two primary roles:

- `teacher`
- `student`

Both roles use the same application, backend, database, course structure, concepts, assessments, and learning data.

The UI and permissions differ by role.

### Teacher

The teacher controls classroom progression and monitors student performance.

### Student

The student follows the learning roadmap, completes unlocked quizzes and assignments, receives personalized learning support, and improves concept mastery.

---

## Current Development Scope

The current development priority is the **Teacher/Admin flow**.

A separate developer may work on the Student flow later.

When implementing teacher functionality:

- Keep shared data models compatible with the future student experience.
- Keep APIs reusable by both roles where appropriate.
- Do not create duplicate teacher/student versions of the same learning entities.
- Do not build student UI unless explicitly requested.
- Do not introduce teacher-only architecture that prevents the student application from consuming the same course, level, concept, quiz, assignment, or mastery data.

The application should remain one shared system with role-based experiences.

---

# Product Flow

The intended product flow is:

text
Teacher Login
      ↓
Teacher Dashboard
      ↓
Select DSA Course
      ↓
Provide Reference Syllabus
      +
Provide Reference YouTube Video
      ↓
Gemini AI Processing
      ↓
Transcript / Content Understanding
      ↓
Concept Identification
      ↓
Video Segmentation
      ↓
Learning Levels + Concepts + Video Chunks
      ↓
Teacher Teaches Concept in Class
      ↓
Teacher Marks Concept as Complete
      ↓
Corresponding Student Level Becomes Unlocked
      ↓
Student Completes Quizzes
      ↓
Student Performance Is Recorded
      ↓
Concept-Level Mastery Is Calculated
      ↓
Learning Gaps Are Detected
      ↓
Relevant Video Chunk / Practice Is Recommended
      ↓
Student Improves
      ↓
Teacher Sees Class-Level and Individual Performance

# Core Product Principle

## Structure First, AI Second

Lacer AI is not primarily an AI chatbot.

AI should strengthen the structured learning system.

The core loop is:

Classroom Teaching  
      ↓  
Concept Completion  
      ↓  
Assessment  
      ↓  
Concept-Level Performance  
      ↓  
Learning-Gap Detection  
      ↓  
Personalized Intervention  
      ↓  
Improvement  
      ↓  
Teacher Insight

AI must not bypass the learning structure.

Do not introduce an open-ended AI tutor that replaces:

-   Teacher-controlled progression
-   Quizzes
-   Assignments
-   Mastery tracking
-   Learning levels
-   Structured learning paths

  

# Hackathon Engineering Philosophy

This is a hackathon MVP.

Optimize for:

-   Correctness
-   Reliability
-   Demonstrability
-   Maintainability
-   Simple architecture
-   Fast implementation
-   Clear data flow
-   Good UX

Do not prematurely optimize for:

-   Massive scale
-   Microservices
-   Distributed systems
-   Enterprise infrastructure
-   Complex ML infrastructure
-   Generalized LMS architecture
-   Speculative future requirements

## Main Rule

> ****Build the simplest architecture that correctly solves the current requirement.****

However, simplicity must never compromise:

-   Authentication
-   Authorization
-   Data integrity
-   Input validation
-   AI output validation
-   Privacy
-   Database consistency
-   API security

Use heavy engineering only when the requirement genuinely needs it.

  

# Existing Technology Stack

The current project uses:

-   Next.js 16
-   React 19
-   JavaScript
-   Tailwind CSS 4
-   MongoDB
-   Mongoose
-   `@google/generative-ai`
-   Google Gemini / Google AI Studio API

Use the existing stack.

Do not add dependencies unless there is a concrete requirement.

Before installing a new package, check whether the requirement can be implemented using:

-   Existing dependencies
-   Next.js
-   React
-   Node.js
-   MongoDB/Mongoose
-   Native browser APIs
-   Simple application code

Avoid unnecessary dependencies.

  

# Framework Rules

Use the existing Next.js App Router.

Prefer:

-   Server Components where appropriate
-   Client Components only when browser interactivity is required
-   Next.js Route Handlers for APIs
-   Server-side database access
-   Server-side authentication and authorization

Do not introduce:

-   Express
-   A second backend server
-   Python backend
-   GraphQL
-   tRPC
-   Microservices

unless explicitly requested.

Next.js should remain the application and API layer.

  

# Repository Rules

Before modifying code:

1.  Inspect the repository structure.
2.  Read `AGENTS.md`.
3.  Inspect relevant existing source files.
4.  Inspect existing models and schemas.
5.  Inspect existing API routes.
6.  Inspect existing authentication.
7.  Inspect existing components.
8.  Inspect configuration files.
9.  Check Git status.

The repository is the source of truth for existing implementation.

Never invent:

-   Existing files
-   Existing APIs
-   Existing models
-   Existing database fields
-   Existing functions
-   Existing routes
-   Existing authentication behavior

If an existing implementation can be extended safely, extend it instead of creating a parallel implementation.

  

# Smallest Safe Change

Make the smallest safe change that satisfies the requirement.

Do not perform unrelated refactors.

Do not:

-   Rewrite working code unnecessarily
-   Rename unrelated files
-   Reorganize the entire repository
-   Migrate frameworks
-   Upgrade dependencies without a reason
-   Introduce abstractions without a real use case
-   Redesign unrelated screens

Prefer understandable code over architectural ceremony.

  

# Shared Product Architecture

Teacher and Student should use the same core learning data.

Conceptually:

                    Lacer AI  
                       |  
                Shared Backend  
                       |  
                 Shared Database  
                       |  
          +------------+------------+  
          |                         |  
       Teacher                   Student  
          |                         |  
 Teacher Dashboard          Student Dashboard

Shared entities include:

-   Users
-   Courses
-   Levels
-   Concepts
-   Video Chunks
-   Quizzes
-   Questions
-   Quiz Attempts
-   Assignments
-   Assignment Attempts
-   Student Mastery
-   Progress

Different parts are:

-   UI
-   Permissions
-   Available actions
-   Dashboards
-   Role-specific workflows

Do not duplicate shared business logic unnecessarily.

  

# Teacher/Admin Flow

## Teacher Login

Teacher logs in using:

-   Email
-   Password

After successful authentication:

Teacher Login  
      ↓  
Teacher Dashboard

The server must determine the authenticated user's identity and role.

Never trust a browser-supplied role.

  

# Teacher Dashboard

The teacher dashboard should provide an immediate overview.

Primary metrics:

-   Total Students
-   Lagging Students
-   Good Students
-   Current Course

Initially the only course is:

> Data Structures & Algorithms (DSA)

Do not build a complex multi-course management platform for the MVP.

The architecture may use `courseId`, but the UI should remain focused on DSA.

  

# Course Setup

The teacher selects:

> Data Structures & Algorithms

The teacher provides:

1.  Reference syllabus
2.  Reference YouTube video

The syllabus represents the intended learning structure.

The reference video provides instructional content.

The expected processing flow is:

Reference Syllabus  
       +  
Reference Video  
       ↓  
Gemini  
       ↓  
Content Understanding  
       ↓  
Concept Identification  
       ↓  
Video Segmentation  
       ↓  
Learning Levels  
       ↓  
Video Chunks

The resulting structured data must be stored in MongoDB.

  

# Gemini Integration

Gemini is an AI processing component.

Use the existing:

```
@google/generative-ai
```

dependency and Google AI Studio/Gemini API.

Gemini may be used for:

-   Syllabus understanding
-   Transcript/content analysis
-   Concept extraction
-   Concept classification
-   Video segmentation
-   Learning-content structuring
-   Quiz generation
-   Practice-question generation
-   Personalized explanations
-   Learning recommendations

Gemini is not the source of truth.

MongoDB and application business logic are the source of truth.

  

# AI Boundaries

Gemini must not directly control:

-   Authentication
-   Authorization
-   User roles
-   Course ownership
-   Student access
-   Teacher permissions
-   Concept completion state
-   Level unlocking
-   Database security
-   Payment/access control

For example, Gemini can identify:

{  
  "concept": "Time Complexity"  
}

The backend decides whether that output is valid and how it should be persisted.

  

# AI Output Validation

Never blindly trust LLM output.

For structured Gemini responses:

1.  Request structured JSON where appropriate.
2.  Parse the response safely.
3.  Validate required fields.
4.  Validate field types.
5.  Validate allowed values.
6.  Reject malformed responses.
7.  Sanitize content before rendering where necessary.
8.  Handle model/API failures.
9.  Never use raw AI output as an authorization decision.

If Gemini fails:

-   Return a safe error.
-   Preserve existing data.
-   Allow retry.
-   Do not claim that processing succeeded.
-   Do not generate fake content to hide the failure.

  

# YouTube Processing

The teacher provides a YouTube URL as reference material.

Do not assume arbitrary YouTube videos will always provide usable transcript or video data.

The implementation must handle:

-   Missing transcript
-   Unsupported content
-   API failure
-   Invalid URL
-   Processing failure
-   Timeout

Never:

-   Fabricate transcripts
-   Fabricate timestamps
-   Fabricate video chunks
-   Claim successful processing when processing failed

If a fallback transcript/manual input is required, implement the simplest reliable fallback.

Do not build a complex video-ingestion infrastructure for the MVP.

  

# Learning Structure

The core learning structure is:

Course  
  ↓  
Level  
  ↓  
Concept  
  ↓  
Quiz  
  ↓  
Question

Example:

DSA  
  
Level 1  
 ├── Arrays  
 ├── Array Operations  
 └── Complexity Basics  
  
Level 2  
 ├── Linked Lists  
 ├── Nodes  
 └── Traversal  
  
Level 3  
 ├── Stacks  
 └── Queues  
  
Level 4  
 └── Trees

The exact structure should come from the teacher's syllabus and reference material.

Do not create unnecessary database entities for simple structures.

  

# Video Chunks

Each relevant learning section of the reference video should be represented by a chunk.

Conceptually:

{  
  "title": "Array Operations",  
  "concept": "Array Operations",  
  "startTime": 320,  
  "endTime": 620  
}

Chunks should remain connected to the concepts they explain.

This allows the student system to later recommend the exact relevant part of the teacher's reference video.

  

# Teacher-Controlled Progression

Teacher-controlled progression is a core product behavior.

When the teacher teaches a concept in class, they can mark it as complete.

Example:

Teacher teaches:  
Arrays  
  
Teacher clicks:  
Mark Concept Complete  
  
Backend:  
Updates completion state  
  
Student:  
Corresponding level becomes available

The backend must enforce access.

Do not rely only on frontend UI such as:

```
disabled button
```

A locked learning unit must remain inaccessible through direct API requests.

  

# Student Compatibility

The future Student flow will consume the same course and learning data.

The student should eventually be able to see:

-   Course
-   Levels
-   Concepts
-   Unlock state
-   Quizzes
-   Assignments
-   Video chunks
-   Personalized recommendations
-   Concept mastery
-   Progress

Therefore, teacher-side implementations must not hardcode assumptions that prevent these resources from being consumed by the Student role.

Teacher actions should modify shared learning state.

  

# Assessment Model

Each learning level will contain:

```
5 quizzes
```

Each quiz contains questions.

Each question should be associated with a concept.

Example:

{  
  "question": "What is the time complexity of...",  
  "options": \[  
    "O(1)",  
    "O(n)",  
    "O(n²)",  
    "O(log n)"  
  \],  
  "correctAnswer": 1,  
  "concept": "Time Complexity",  
  "difficulty": "medium"  
}

The concept association is essential.

Do not store only:

```
Quiz Score = 60%
```

The system must eventually be able to determine:

Time Complexity = weak  
Arrays = strong  
Traversal = good

  

# Quiz Attempts

Do not overwrite historical quiz attempts.

Each submission should be recorded.

Conceptually:

Student  
   ↓  
Quiz Attempt  
   ↓  
Question Answers  
   ↓  
Question Concept  
   ↓  
Concept Performance

This allows the system to track improvement over time.

  

# Assignments

The product includes an assignment after every six days of learning.

For the MVP, assignments should contain:

-   Assignment
-   Questions
-   Submission
-   Score
-   Concept performance

Assignment results should contribute to the student's concept-level performance.

Do not build a complex scheduling engine.

A simple availability/due-date mechanism is sufficient for the MVP.

  

# Concept-Level Mastery

The most important analytical unit is:

```
Student × Course × Concept
```

Not merely:

```
Student × Course × Overall Score
```

Example:

Student: Rahul  
  
Arrays             92%  
Traversal           85%  
Time Complexity     38%  
Linked Lists        74%

The system should be able to identify:

> Time Complexity is a learning gap.

  

# MVP Mastery Calculation

Do not implement complex machine learning for the hackathon.

Use a simple, deterministic, explainable calculation.

A basic starting point can be:

Concept Accuracy =  
Correct Answers for Concept  
\---------------------------  
Attempted Answers for Concept

Example classification:

80–100% → Strong  
60–79%  → Good  
40–59%  → Needs Practice  
0–39%   → Learning Gap

These thresholds may be changed later.

Do not implement:

-   Deep Knowledge Tracing
-   Bayesian Knowledge Tracing
-   Neural mastery models
-   Custom ML training infrastructure

unless explicitly requested.

  

# Personalized Intervention

When a student's concept mastery is low:

Learning Gap Detected  
        ↓  
Identify Concept  
        ↓  
Find Relevant Teacher Video Chunk  
        ↓  
Recommend Targeted Content  
        ↓  
Practice  
        ↓  
Reassess  
        ↓  
Update Mastery

Recommendations should be grounded in the teacher-provided learning content.

Do not recommend random external content when the intended product behavior is to use the teacher's reference material.

  

# Adaptive Difficulty

The future student system will adjust question difficulty based on performance.

For the MVP, use simple deterministic rules.

Example:

Low mastery  
    ↓  
Easy questions  
  
Moderate mastery  
    ↓  
Medium questions  
  
High mastery  
    ↓  
Hard questions

Do not build a complex recommendation engine unless the current requirement requires it.

  

# Teacher Class-Level Analytics

The teacher should be able to understand where the class is struggling.

Example:

Concept             Students Struggling  
  
Recursion           18  
Time Complexity     14  
Linked Lists        10  
Arrays               3

The primary question is:

> Which concepts need teacher attention?

Not only:

> What is the class average?

  

# Teacher Individual Student View

The teacher should eventually be able to select a student and see:

Student  
Registration ID  
  
Overall Performance  
  
Concepts  
\- Arrays  
\- Linked Lists  
\- Complexity  
\- Recursion  
  
Quiz Performance  
Assignment Performance  
Concept Mastery  
Learning Gaps  
Improvement Over Time

The teacher should be able to understand ****why**** a student is struggling rather than only seeing a low score.

  

# Authentication

Authentication must be server-verified.

Never trust browser-supplied:

-   `userId`
-   `role`
-   `teacherId`
-   `studentId`
-   ownership information

The server must derive the authenticated identity from the authentication mechanism.

Every protected endpoint must verify:

1.  Authentication.
2.  Correct role.
3.  Resource ownership/access.

  

# Password Security

Passwords must never be stored in plaintext.

If password authentication is implemented:

-   Hash passwords securely.
-   Never log passwords.
-   Never expose passwords.
-   Never return password hashes to clients.

Never log:

-   Passwords
-   API keys
-   Authentication tokens
-   Session secrets

  

# Environment Variables

Secrets must remain server-side.

Examples:

MONGODB\_URI  
GEMINI\_API\_KEY  
AUTH\_SECRET

Never expose secrets using:

```
NEXT_PUBLIC_*
```

Never hardcode secrets.

Never commit secret `.env` files.

  

# MongoDB

MongoDB is the persistent source of truth.

Do not use localStorage for persistent application state.

React state may be used for temporary UI state.

Persistent application state belongs in MongoDB.

Use Mongoose where appropriate.

Avoid unnecessary repository/service abstraction layers.

A simple model or server-side function is preferred when it is sufficient.

  

# Database Entities

The initial conceptual entities are:

User  
Course  
Level  
Concept  
VideoChunk  
Quiz  
Question  
QuizAttempt  
Assignment  
AssignmentAttempt  
StudentMastery

Do not create a separate collection for every small concept or UI concern.

Use embedded structures where appropriate.

Only introduce a new model/collection when it provides a real current benefit.

  

# Database Consistency

Consider:

-   Duplicate writes
-   Repeated requests
-   Invalid references
-   Missing resources
-   Ownership
-   Concurrent updates

Use:

-   Unique indexes
-   Atomic MongoDB operations
-   Appropriate validation

when genuinely needed.

Do not introduce distributed locking or complex transaction infrastructure unless required.

  

# API Design

APIs should represent real product actions.

Prefer simple feature-oriented APIs.

Potential teacher APIs may include:

POST /api/auth/login  
  
GET  /api/teacher/dashboard  
  
GET  /api/teacher/courses  
  
GET  /api/teacher/courses/:courseId  
  
POST /api/teacher/courses  
  
POST /api/teacher/courses/:courseId/process  
  
POST /api/teacher/levels/:levelId/complete  
  
GET  /api/teacher/students  
  
GET  /api/teacher/students/:studentId

These are examples, not existing contracts.

Before creating an endpoint:

1.  Search the repository.
2.  Check whether an equivalent endpoint already exists.
3.  Reuse or extend it if appropriate.

Do not create generic CRUD endpoints only for architectural completeness.

  

# API Security

Every protected API must:

-   Authenticate the request.
-   Authorize the user.
-   Validate input.
-   Validate resource ownership.
-   Handle missing resources.
-   Return appropriate status codes.
-   Avoid leaking internal errors.
-   Avoid trusting browser-supplied ownership information.

Never return raw MongoDB errors or internal stack traces to the client.

  

# Frontend Architecture

Keep the frontend simple.

Use reusable components when real reuse exists.

Prefer straightforward components such as:

TeacherDashboard  
CourseCard  
StatCard  
CourseSetup  
VideoProcessing  
StudentTable  
LearningGapTable  
StudentPerformance

Do not create unnecessary abstractions such as:

UniversalDashboardEngine  
GenericEntityRenderer  
DynamicComponentManager  
AbstractCardFactory

unless the repository has a genuine reason for them.

  

# UI/UX

The teacher should immediately understand:

1.  How many students need attention.
2.  Which concepts are weak.
3.  Which course is active.
4.  Which concepts have been taught.
5.  Which students are struggling.
6.  Whether student performance is improving.

Prioritize:

-   Clear hierarchy
-   Responsive design
-   Accessibility
-   Fast comprehension
-   Obvious actions
-   Useful feedback

Do not clutter the dashboard with unnecessary analytics.

  

# Loading, Error, Empty and Success States

Every asynchronous feature must handle:

### Loading

Show what is currently happening.

### Error

Show a human-readable error and retry option where appropriate.

### Empty

Explain what the user should do next.

### Success

Clearly confirm important actions.

For AI processing, provide meaningful progress feedback such as:

Processing reference material...  
Analyzing content...  
Identifying concepts...  
Creating video segments...  
Building learning structure...

Do not leave users with an indefinite spinner.

  

# Form Validation

Validate inputs on the server.

Client-side validation is for UX only.

Validate:

-   Email
-   Password
-   Registration ID
-   Course information
-   Syllabus input
-   YouTube URL
-   Database IDs
-   AI-generated structured data

Never rely only on browser validation.

  

# Data Ownership and Privacy

Teacher A must not be able to access Teacher B's private course or student data.

Student performance must only be available to authorized users.

Server-side authorization must verify access to:

-   Courses
-   Students
-   Performance
-   Attempts
-   Mastery
-   Assignments
-   Other private learning data

Do not expose private student information unnecessarily.

  

# Performance

For the hackathon MVP, straightforward database queries are preferred.

Do not prematurely introduce:

-   Redis
-   Kafka
-   Elasticsearch
-   Vector databases
-   Background worker systems
-   Complex caching infrastructure
-   Distributed processing

If a real bottleneck appears, solve that bottleneck specifically.

  

# AI Architecture

Use this boundary:

Frontend  
   ↓  
Next.js Server/API  
   ↓  
Gemini  
   ↓  
Validate AI Output  
   ↓  
Application Business Logic  
   ↓  
MongoDB  
   ↓  
Frontend

Do not use:

Frontend  
   ↓  
Gemini  
   ↓  
Blindly trust response

The backend remains responsible for:

-   Validation
-   Authorization
-   Business logic
-   Persistence
-   Data integrity

  

# Demo Reliability

The hackathon demo should be deterministic and reliable.

Seeded demo data may be used for:

-   Students
-   Quiz attempts
-   Assignment attempts
-   Concept mastery
-   Learning gaps
-   Progress

Demo data must be clearly treated as demo/seed data.

Do not present fabricated demo data as real student data.

Do not make the critical demo flow dependent on an unreliable external operation when a safe fallback is possible.

  

# Do Not Build Unless Explicitly Requested

Do not introduce:

-   AI chatbot
-   RAG
-   Vector search
-   Embeddings
-   Fine-tuning
-   ML training infrastructure
-   Microservices
-   Mobile app
-   Real-time classroom chat
-   Notification infrastructure
-   Email automation
-   Payment system
-   Enterprise multi-tenancy
-   Complex role hierarchies
-   Course marketplace
-   Complex scheduling engine
-   Recommendation microservice
-   Analytics warehouse

The MVP should remain focused on the core learning-gap workflow.

  

# Heavy Lifting vs Minimal Work

## Do Heavy Lifting When

The requirement genuinely requires substantial implementation.

Examples:

-   Secure authentication
-   Authorization
-   MongoDB integration
-   Gemini integration
-   AI output validation
-   Teacher analytics
-   Concept-level mastery
-   Learning-gap detection
-   UI/API/database integration
-   Data consistency
-   Duplicate-write protection

The agent should take initiative on obvious implementation details instead of asking for permission at every step.

## Keep It Minimal When

A simple implementation is correct and sufficient.

For example, if this is enough:

```
calculateMastery()
```

do not create:

MasteryEngine  
MasteryStrategy  
MasteryStrategyFactory  
MasteryRepository  
MasteryDomainService  
MasteryPipeline

unless the repository genuinely requires those abstractions.

  

# Engineering Decision Rule

When choosing between two implementations:

## Prefer the simpler implementation when:

-   Both are correct.
-   Both are secure.
-   Both are maintainable.
-   Both satisfy the requirement.

## Prefer the more robust implementation when:

-   The simple implementation creates a security issue.
-   Data can become inconsistent.
-   Duplicate writes are possible.
-   AI output can corrupt application state.
-   Authorization can be bypassed.
-   The implementation blocks an already-required product flow.
-   Reliability would materially suffer.

Do not add complexity merely because it is technically possible.

  

# Source of Truth Hierarchy

When information conflicts, use this priority:

1.  Existing repository implementation.
2.  Existing database/schema definitions.
3.  Existing API contracts.
4.  This `AGENTS.md`.
5.  Explicit current user requirement.
6.  Reasonable implementation assumptions.

Never invent behavior that conflicts with the repository.

If existing behavior conflicts with the required product behavior:

1.  Inspect the implementation.
2.  Identify the conflict.
3.  Make the smallest safe change.
4.  Avoid unrelated refactoring.

  

# Testing

Test behavior that matters.

## Authentication

Verify:

-   Valid login
-   Invalid login
-   Unauthorized access
-   Incorrect role

## Teacher Authorization

Verify:

-   Teacher can access authorized courses.
-   Teacher cannot access another teacher's private data.

## Course

Verify:

-   Course creation
-   Course retrieval
-   Course ownership

## AI

Verify:

-   Successful processing
-   Malformed AI response
-   AI failure
-   Retry behavior

## Progression

Verify:

-   Incomplete concept remains locked.
-   Completed concept becomes available.
-   Repeated completion is safe.
-   Unauthorized completion fails.

## Assessment

Verify:

-   Quiz submission
-   Question/concept mapping
-   Concept performance
-   Mastery calculation
-   Learning-gap classification

Never claim that tests passed unless they were actually executed.

  

# Git Discipline

Before significant changes:

git status  
git branch  
git diff

Keep commits focused.

Prefer commits such as:

feat: add teacher dashboard  
feat: add DSA course setup  
feat: integrate Gemini processing  
feat: add concept completion  
feat: add teacher learning gap analytics

Do not mix unrelated refactors into feature commits.

Never assume a branch is merged merely because it contains a merge commit.

  

# Implementation Workflow

For every feature:

1\. Inspect repository  
       ↓  
2\. Identify existing implementation  
       ↓  
3\. Understand current data flow  
       ↓  
4\. Define smallest required change  
       ↓  
5\. Implement  
       ↓  
6\. Validate input and security  
       ↓  
7\. Test  
       ↓  
8\. Inspect Git diff  
       ↓  
9\. Report what changed

Do not generate an entirely new application structure when the repository already contains one.

  

# Final Product Definition

Lacer AI should answer three questions.

### For the Teacher

> Which students and concepts need my attention?

### For the Student

> What do I need to learn next, and why?

### For the System

> What evidence do we have about this student's mastery?

The complete product loop is:

TEACHING  
   ↓  
LEARNING  
   ↓  
ASSESSMENT  
   ↓  
MASTERY  
   ↓  
LEARNING GAP  
   ↓  
PERSONALIZED INTERVENTION  
   ↓  
IMPROVEMENT  
   ↓  
TEACHER INSIGHT

## Core Principle

**Lacer AI is a structured learning and mastery system powered by AI — not an AI chatbot with educational features.**