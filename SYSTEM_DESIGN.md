# AI LMS — System Design

A one-line pitch you can open an interview with:

> An exam platform where teachers create classrooms and question banks (with AI-assisted question generation), build timed exams from them, and students take those exams under server-enforced anti-cheat rules, with auto-grading and per-classroom/global leaderboards.

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | One codebase for pages + API routes, file-system routing, server components where useful. |
| Language | TypeScript | Types catch a whole class of "wrong field name" bugs before runtime — important with a 60+ route API surface. |
| Database | PostgreSQL (hosted on Neon, serverless) | Relational data (users → classrooms → exams → questions → attempts → answers) is naturally foreign-key-shaped. |
| ORM | Prisma 7 + `@prisma/adapter-pg` | Type-safe queries generated from `schema.prisma`; the driver adapter lets Prisma talk to Neon's serverless Postgres over a plain `pg` connection instead of Prisma's own binary engine. |
| Auth | NextAuth v4, JWT session strategy | Credentials-based login (email/password) with a stateless JWT — no session table to manage, works well with serverless/edge middleware. |
| UI | Tailwind CSS + shadcn/ui (Base UI under the hood) + Lucide icons | One design system, no second UI library to learn/maintain. |
| Email | Resend | Verification, password reset, and teacher-invite emails. |
| File storage | Cloudinary | Question images, avatars. |
| AI | Google Gemini (`gemini-2.5-flash`) | Generates question banks from a topic/prompt so teachers don't have to write every question by hand. |

---

## 2. High-level architecture

```
                        ┌─────────────────────────┐
                        │        Browser           │
                        │  (React client components)│
                        └───────────┬───────────────┘
                                    │ HTTPS
                                    ▼
                 ┌──────────────────────────────────────┐
                 │            Next.js server              │
                 │                                        │
                 │  src/proxy.ts (middleware)              │
                 │   └─ blocks /dashboard,/teacher,/student,│
                 │      /admin,/profile,/settings for       │
                 │      logged-out users (redirects→/login) │
                 │                                        │
                 │  src/app/(app)/...        ← pages       │
                 │  src/app/api/...          ← REST routes │
                 │                                        │
                 │  Every API route independently re-checks│
                 │  session + role + resource ownership     │
                 │  (defense in depth — middleware only     │
                 │  checks "logged in", not "allowed to     │
                 │  touch THIS classroom/exam").            │
                 └───────┬─────────────┬─────────────┬─────┘
                         │             │             │
                         ▼             ▼             ▼
                 ┌───────────┐ ┌─────────────┐ ┌───────────┐
                 │ PostgreSQL │ │   Resend    │ │ Cloudinary│
                 │  (Neon)    │ │  (email)    │ │ (uploads) │
                 └───────────┘ └─────────────┘ └───────────┘
                         ▲
                         │
                 ┌───────────────┐
                 │  Google Gemini │
                 │ (AI questions) │
                 └───────────────┘
```

Everything runs inside one Next.js app — there's no separate backend service. "Backend" here means the ~70 route handlers under `src/app/api/`, each a plain async function doing: auth check → role check → ownership check → Prisma query → JSON response.

---

## 3. Folder structure

```
src/
  proxy.ts                 -- route-protection middleware (Next 16 renamed middleware.ts → proxy.ts)
  lib/
    auth.ts                 -- NextAuth config (authOptions): credentials provider, JWT callbacks, role on the token
    prisma.ts                -- singleton PrismaClient (+ Neon driver adapter)
    grading.ts                -- gradeAttempt() + recalculateTotalMarks() — the one place scoring logic lives
    shuffle.ts                -- seeded Fisher-Yates shuffle (per-student stable question/option order)
    mail.ts, resend.ts         -- transactional email sending
    gemini.ts                  -- AI question generation client
    role.ts                     -- isTeacher()/isAdmin() helpers
  app/
    (app)/                    -- route group: pages sharing the dashboard chrome
      login/ register/ forgot-password/ reset-password/ verify-email/
      dashboard/               -- role-based redirect landing page
      student/                  -- student-only pages
      teacher/                   -- teacher-only pages
      admin/                      -- admin-only pages
      profile/ settings/           -- shared across roles
    api/
      auth/ login/ register/ forgot-password/ reset-password/ verify-email/   -- account lifecycle
      classrooms/                -- create/join/leave/manage classrooms
      questions/ exam-questions/  -- question bank + attaching questions to exams
      exams/                       -- exam CRUD, publish/start/end, access-code, duplicate
      attempts/                     -- start/save/submit/force-submit/resume an attempt
      violations/                    -- anti-cheat event logging
      results/ analytics/             -- score views, leaderboards, per-question stats
      notifications/ teacher-invite/ users/ upload/ ai/ docs/
```

---

## 4. Data model

Everything hangs off `User`. Simplified relationships (see `prisma/schema.prisma` for the full file):

```
User ──owns──> Classroom ──has many──> ClassroomMember ──> User (the students)
User ──creates──> Question ──has many──> QuestionOption
User ──creates──> Exam (belongs to a Classroom)
Exam ──has many──> ExamQuestion (join table) ──> Question
                      (order, so a teacher controls question sequence)
Exam ──has many──> ExamAttempt ──> User (the student who is/was attempting it)
ExamAttempt ──has many──> AttemptAnswer ──> Question / QuestionOption
ExamAttempt ──has many──> Violation (anti-cheat log)
```

Why a join table (`ExamQuestion`) instead of a direct many-to-many: a teacher builds one question bank and reuses questions across multiple exams, and each exam needs its own question **order** — that per-relationship data (`order`) is exactly what a join table is for.

Key enums (`ExamStatus`, `AttemptStatus`, `QuestionType`, `ViolationType`) are stored as Postgres enums via Prisma — this keeps invalid states (like a typo'd status string) impossible at the database level, not just checked in application code.

---

## 5. Authentication & authorization

Two layers, deliberately redundant:

1. **`src/proxy.ts`** (Next's middleware, renamed to `proxy.ts` in Next 16) — runs before any protected page loads. Uses NextAuth's `withAuth` to redirect anyone without a valid session straight to `/login`. This is a coarse gate: "are you logged in at all."

2. **Every API route re-checks, independently**:
   - `getServerSession(authOptions)` — is there a session?
   - `session.user.role === "teacher"` (or whichever role the route needs)
   - **Ownership**: e.g. in `exam-questions/add`, it checks `exam.createdById === teacherId` AND `question.createdById === teacherId` before allowing the attach. A teacher can never touch another teacher's exam or question just by knowing its ID.

This two-layer design matters for an interview answer: middleware alone is not authorization — it only proves "logged in," never "allowed to do this specific thing to this specific resource." Every route is written as if the middleware didn't exist.

**Session strategy**: JWT, not database sessions. On login, `authorize()` checks the password (bcrypt-compared) and returns the user; the `jwt` callback stamps `id`/`role`/`email` onto the token; the `session` callback copies those back onto `session.user` so client components can read `role` without an extra DB round-trip on every request.

---

## 6. Core flows

### 6.1 Classroom
Teacher creates a classroom → gets a random `joinCode`. Students join by entering the code (`ClassroomMember` row created). A student can leave and rejoin later.

### 6.2 Question bank
Teacher writes questions manually, or generates them with AI: `teacher/ai` page → `/api/ai/*` → Gemini returns structured JSON (question text, options, correct answer, marks) → teacher reviews before saving. Either path lands in the same `Question`/`QuestionOption` tables, so the exam-building flow doesn't care how a question was authored.

### 6.3 Exam lifecycle (state machine)

```
draft ──publish──> published ──start──> ongoing ──end──> completed
```

- **draft**: teacher is still adding questions/settings. Invisible to students.
- **published**: visible to students, but the teacher hasn't clicked "Start" — `startsAt`/`endsAt` gate whether a student can actually begin an attempt.
- **ongoing**: teacher clicked "Start." Students can begin attempts (subject to the same time window + optional access code).
- **completed**: teacher clicked "End" (or, conceptually, `endsAt` has passed) — all in-progress attempts get force-submitted and graded, exam becomes read-only for results.

Every route that gates student access re-checks `status` — this was a recurring bug source during development (a route checking `status === "published"` only, silently locking students out the moment the teacher started the exam), which is why it's worth stating explicitly as a lesson: **a status enum used in N places needs to be updated in all N places, or write one shared helper that all routes call instead of repeating the check.**

`totalMarks` is **derived, not manually entered** — it's recalculated (`recalculateTotalMarks()` in `lib/grading.ts`) every time a question is attached to or removed from an exam, so it can never drift out of sync with what the exam can actually award.

### 6.4 Taking an exam (the most complex flow)

1. `POST /api/attempts/start` — validates: exam is published/ongoing, within its time window, student is an active classroom member, access code matches (if required), and the student hasn't already attempted it. Creates one `ExamAttempt` row (`in_progress`).
2. `GET /api/exams/[id]` — for a student, returns a **sanitized** view: no `isCorrect` flags, options and question order run through a **seeded shuffle** keyed on `studentId + questionId`, so each student sees a stable-but-different order (can't just say "the answer is option B" to classmates) without needing to store a per-student copy of the exam.
3. Client runs a countdown timer (`durationMinutes`) and autosaves each answer to `/api/attempts/save` as it's picked — so a page refresh never loses progress.
4. The exam ends one of three ways, and **all three converge on the same `gradeAttempt()` function** in `lib/grading.ts` so scoring logic only exists once:
   - Student clicks Submit → `/api/attempts/submit`
   - Timer hits zero, or student closes the tab and reopens after time is up → `/api/attempts/resume` detects `elapsed > duration` server-side and grades it (server-side, not just the client countdown — a student can't cheat by never letting the client-side timer fire)
   - Teacher clicks "End exam" → `/api/exams/[id]/end` force-submits every still-`in_progress` attempt

### 6.5 Anti-cheat
Client listens for `visibilitychange` (tab switch), `copy`/`paste`, `contextmenu` (right-click), and `fullscreenchange`, and reports each as a `Violation` row via `/api/violations`. **The server, not the client, decides when enough violations force an auto-submit** — the client only reports events, it never decides "I've cheated too much, I'll submit myself," because a modified client could just skip that logic entirely.

### 6.6 Results & analytics
- Per-student: score, percentage, pass/fail against `passingMarks`.
- Per-question: `groupBy` aggregate showing how many students picked each option (spot questions that are ambiguous or mis-keyed).
- Leaderboards: per-exam (teacher view), per-classroom, and a global cross-classroom leaderboard.
- Manual grading: `short_answer` questions have no `isCorrect` option to auto-check, so they land in a teacher-facing grading queue (`teacher/exams/[id]/results/[attemptId]`) instead of being scored by `gradeAttempt()`.

---

## 7. Key design decisions (good interview material)

- **JWT sessions over DB sessions**: no session table, no server-side session lookup on every request — trades "can't force-revoke a session instantly" for simplicity and speed. Acceptable here because there's no requirement for instant remote logout.
- **Server-authoritative grading and anti-cheat**: the client is never trusted to compute a score or decide when to auto-submit — it only reports raw events/answers; every decision that matters is made server-side against data the client can't see (`isCorrect` is stripped from what students receive).
- **Seeded (not random) shuffling**: a plain Fisher-Yates shuffle seeded by a string hash of `studentId + questionId` gives each student a consistent order across page reloads without persisting a per-student question order row — deterministic function of IDs instead of stored state.
- **Derived `totalMarks`**: rather than trusting a teacher-typed number to stay correct as questions are added/removed, it's recomputed from the actual attached questions every time the set changes — eliminates an entire class of "score shows over 100%" bugs.
- **One shared `gradeAttempt()`**: every path that can end an attempt (manual submit, timeout, teacher force-end, anti-cheat auto-submit) calls the same function instead of three copies of similar-but-slightly-different scoring logic.

---

## 8. Known limitations (honest, and fine to mention if asked)

- No cron job automatically flips an exam to `completed` when `endsAt` passes — it currently requires either the teacher clicking "End" or a student's own resume-triggered timeout check. A stale `in_progress` attempt where the student never returns stays ungraded until someone visits it.
- Prisma migration history has some drift (a schema change was applied with a raw `ALTER TABLE` instead of `prisma migrate dev`, to avoid an unrelated table `prisma migrate` wanted to touch) — noted as tech debt, not blocking.
- `Socket.io` is a dependency but not currently wired into any route — was planned for live exam monitoring, not yet built.

---

## 9. If an interviewer asks "how would you scale this?"

- The database is the first bottleneck (single Postgres instance) — Neon supports read replicas; most of this app's reads (results, leaderboards) could go to a replica.
- Exam-taking traffic is spiky (everyone starts at the same time) — `attempts/start` does several sequential Prisma calls (exam lookup, student lookup, classroom lookup, membership lookup, duplicate-attempt check) that could be collapsed into fewer round-trips or a single transaction under load.
- Anti-cheat violation logging is a small, frequent write — a natural candidate to batch client-side (send every N seconds instead of per-event) if it ever became a hot path.
