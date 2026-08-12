# Guide: Violations, Analytics, and Admin APIs

This is a step-by-step guide for you to implement the three modules from `README.md` (sections 11–13) yourself. It does **not** contain finished code — it tells you what to build, in what order, using what schema fields, and points you at existing files in this codebase to use as a reference pattern.

Read the "Current state" note at the top of each module first — some of this already exists under a different path, and duplicating it would be wasted effort. Where that's true, I've said so plainly.

Every route in this codebase already follows one shape (you'll see it in every file you open):

```
Validation → Authentication → Authorization → Business Logic → DB Query → Response
```

Follow that same order in everything you write here. It's also the exact structure you should narrate if asked to explain one of these routes in an interview.

---

## 11. Violations APIs

### Current state

- `Violation` model already exists in `prisma/schema.prisma` (no migration needed):
  ```
  model Violation {
    id, attemptId, type (ViolationType enum), details, createdAt
  }
  ```
  `ViolationType` enum: `tab_switch | fullscreen_exit | copy_paste | right_click | window_blur`.
- `POST /api/attempts/force-submit` already exists and already does most of "auto-submit" — it grades all answers, marks the attempt `auto_submitted`, and (if a `reason` string is passed) creates one `Violation` row hardcoded to `type: "tab_switch"`.
- The student exam page (`src/app/(app)/student/exams/[id]/page.tsx`) already detects one violation type client-side (tab switching, via the `visibilitychange` event) and calls `force-submit` once a threshold is crossed.

### What's actually new to build

1. A single place to **log** a violation without necessarily ending the exam (right now, a violation is only ever recorded as a side-effect of force-submitting).
2. Detecting the other three event types client-side (fullscreen exit, copy/paste, right-click).
3. A way for a teacher to **view** the violation log for an attempt on its own (right now it's only visible bundled inside the full attempt detail).

### Decision to make before you start

The README lists 4 near-identical POST routes (`tab-switch`, `fullscreen-exit`, `copy-paste`, `right-click`) that would each do the same thing with a different hardcoded `type`. You have two honest options:

- **(A) Build exactly what the README says** — 4 separate route files. More files, but very explicit; good if you want the practice of writing similar routes several times.
- **(B) Build one generic route**, `POST /api/violations`, that takes `{ attemptId, type, details }` in the body. Less duplication, and it's the same amount of frontend work either way (the frontend has to specify which event happened no matter what).

Either is a legitimate real-world choice — this is the kind of trade-off worth being able to explain out loud ("I chose one generic endpoint over four to avoid repeating the same logic four times"). The steps below are written for **option B**; if you pick A, just repeat step 2 for each of the 4 folders with a hardcoded `type` instead of reading it from the body.

### Step-by-step

**1. Create `src/app/api/violations/route.ts`** (`POST`)

- Auth: must be logged in, must be `role === "student"`.
- Validate the body: `attemptId` (string), `type` (must be one of the `ViolationType` enum values — you can import `ViolationType` from `@prisma/client` and check `Object.values(ViolationType).includes(type)`, or use a small Zod enum like `src/validation/question.schema.ts` does for its `type` field), `details` (optional string).
- Look up the `ExamAttempt` by `attemptId`. 404 if not found.
- Ownership check: `attempt.studentId === session.user.id` (403 otherwise) — same pattern as `src/app/api/attempts/save/route.ts`.
- Guard: if `attempt.status !== "in_progress"`, there's nothing to log against — return 400.
- Create the `Violation` row (`prisma.violation.create`).
- **Then check the threshold**: count how many violations exist for this attempt so far (`prisma.violation.count({ where: { attemptId } })`). Compare against the exam's configured limit — note the schema only has `Exam.maxTabSwitches` (not a generic "max violations" field), so for now treat that field as the overall violation ceiling regardless of type, or add your own reasoning here (e.g. "3 of any kind").
- If the count is at/over the limit, do the same grading + status update that `force-submit` does (score the answers, set `status: "auto_submitted"`, `submittedAt: new Date()`), and say so in the response (e.g. `{ message: "Violation logged", autoSubmitted: true, score }`). If you don't want to duplicate that grading loop, look closely at how `src/app/api/attempts/force-submit/route.ts` does it — you can literally copy that loop's structure into this route once you understand it (this codebase doesn't have a shared "grade an attempt" helper function yet — pulling that loop into `src/lib/` as a shared function first, then calling it from both `force-submit` and your new route, is a nice bonus refactor once both work).
- If under the limit, just respond `{ message: "Violation logged", autoSubmitted: false }`.

**2. Create `src/app/api/violations/[attemptId]/route.ts`** (`GET`)

- Auth required.
- Look up the attempt, including `exam: true` (you need `exam.createdById` for the teacher check).
- Authorization: student can view only if `attempt.studentId === session.user.id`; teacher can view only if `attempt.exam.createdById === session.user.id`; admin can view anything. (This exact three-way check already exists in `src/app/api/attempts/[id]/route.ts` — read it for the pattern.)
- Query: `prisma.violation.findMany({ where: { attemptId }, orderBy: { createdAt: "desc" } })`.
- Return `{ violations }`.

**3. Frontend: detect the other violation types**

In `src/app/(app)/student/exams/[id]/page.tsx`, the tab-switch detector is a `useEffect` that adds a `document.addEventListener("visibilitychange", ...)` listener. Add sibling effects the same way:
- **Copy/paste**: listen for `copy` and `paste` events on `document`.
- **Right-click**: listen for `contextmenu` on `document` (and call `e.preventDefault()` if you want to actually block it, not just detect it).
- **Fullscreen exit**: only relevant if `exam.fullscreenRequired` is true (this field exists on `Exam` but nothing currently reads it on the student side) — listen for `fullscreenchange` and check `document.fullscreenElement === null`.

Each listener should call your new `POST /api/violations` endpoint with the matching `type`, the same way `handleSelectOption` already calls `/api/attempts/save`. If the response comes back with `autoSubmitted: true`, redirect to the results page immediately (reuse the existing `goToResults()` function).

**4. Frontend: show the log to teachers**

Add a small section to `src/app/(app)/teacher/exams/[id]/results/[attemptId]/page.tsx` (the grading page you already have) that fetches `GET /api/violations/{attemptId}` and lists each one (type + timestamp). This page already receives `violations` as part of the attempt detail response, actually — check whether you even need the new GET route for this specific page, or whether it's more useful as a standalone thing (e.g. a violations tab elsewhere). Worth deciding once you see what data you already have in hand.

---

## 12. Analytics APIs

### Current state — read this before writing anything

Three of the four listed routes **already exist**, just at different paths:

| README's planned route | Already built as | Notes |
|---|---|---|
| `GET /api/analytics/classroom` | `GET /api/results/classroom` | Teacher-wide stats across all their classrooms, with a per-classroom breakdown (avg score, pass rate, student/exam counts). |
| `GET /api/analytics/exam` | `GET /api/exams/[id]/results` | Per-exam stats (average/highest/lowest score, pass/fail counts) + per-student attempt list. Path param instead of query param, but same job. |
| `GET /api/analytics/student` | Partially: `GET /api/results/students` | This one only covers a **student viewing their own** results. A teacher viewing **one specific student's** performance across exams doesn't exist yet — see below. |

Building new routes that just re-implement the same query under `/api/analytics/*` would be pure duplication. Decide up front: do you want to (a) leave these where they are and only build what's missing, or (b) move/rename them for a cleaner namespace? Renaming means updating every frontend `fetch()` call that currently points at the old path — search for `/api/results/classroom` and `/api/exams/${examId}/results` in `src/app/(app)` to find them all if you go that route.

### What's actually new to build

**A. Teacher's view of one student's performance** (the real gap in "student performance")

Create `src/app/api/analytics/student/route.ts` (`GET`, query param `?studentId=`):
- Auth: teacher only.
- Ownership scoping: you only want exams *this teacher* created. Query `prisma.examAttempt.findMany({ where: { studentId, status: "submitted", exam: { createdById: session.user.id } }, include: { exam: true } })` — the nested `exam: { createdById: ... }` filter is the same pattern `src/app/api/exams/get-exams/route.ts` uses for its student branch (`classroom: { members: { some: { userId } } }`), just one relation over.
- Compute: total attempts, average percentage, pass count, and return the list of individual attempts (exam title, score, percentage, submittedAt) so the teacher can see the trend, not just one number.
- 404 if there are no attempts (matches the convention every other results route in this app already uses for "nothing found yet").

**B. Question-level analytics** (fully new — nothing like this exists)

This is the most interesting one to build because it requires joining across attempts, not just reading a stored field. Create `src/app/api/analytics/question/route.ts` (`GET`, query param `?questionId=`):
- Auth: teacher only, and check `question.createdById === session.user.id` (404/403 if not their question — same ownership-check shape as `src/app/api/questions/[id]/delete/route.ts`).
- Query every `AttemptAnswer` for that `questionId` where `isCorrect` is not null (i.e., it's actually been graded): `prisma.attemptAnswer.findMany({ where: { questionId, isCorrect: { not: null } } })`.
- Compute: how many times answered, how many correct, a percentage ("this question was answered correctly by 40% of students who saw it") — this is the number that tells a teacher "this question might be worded confusingly" or "too easy."
- If you want to go further: for `mcq`/`multiple_select` types, group by `selectedOptionId` and count how often each *wrong* option was picked — that tells the teacher which specific distractor is misleading people. This needs a `groupBy` (`prisma.attemptAnswer.groupBy({ by: ["selectedOptionId"], where: { questionId }, _count: true })`) — new Prisma method if you haven't used `groupBy` before, worth reading the Prisma docs section on it.

### Step-by-step (both new routes)

1. Auth + role check.
2. Parse and validate the query param (return 400 if missing).
3. Ownership check (don't let a teacher pull another teacher's student/question data).
4. Run the query.
5. Handle the empty case (404, matching every other results route's convention here).
6. Shape the response — return round, presentable numbers (e.g. `Number(x.toFixed(2))`, same as `src/app/api/results/classroom/route.ts` does), not raw floats.

---

## 13. Admin APIs

### Current state

Contrary to the README, there's no `/api/admin/*` folder at all. Admin functionality actually lives under `/api/users/*`:

| README's planned route | Already built as |
|---|---|
| `GET /api/admin/users` | `GET /api/users/get-all-users` (paginated) |
| `DELETE /api/admin/delete-user` | `DELETE /api/users/[id]` |
| `PATCH /api/admin/suspend` | `PATCH /api/users/status` (handles active/inactive/suspended) |
| `PATCH /api/admin/user-role` | **Doesn't exist anywhere** |
| `GET /api/admin/logs` | **Doesn't exist anywhere** — see below, this one's a bigger job than it looks |

### What's actually new to build

**A. Change a user's role** (small, self-contained — build this one first)

Create `src/app/api/users/role/route.ts` (`PATCH`) — matches the naming convention of the sibling `src/app/api/users/status/route.ts`, which you should open and use as your template; this route is almost identical in shape:
- Auth: admin only.
- Validate body: `{ id: string, role: "student" | "teacher" | "admin" }` (Zod enum, same style as `updateStatusSchema` in `users/status/route.ts`).
- Look up the target user; 404 if missing.
- Consider: should an admin be able to demote themselves out of admin? (`users/[id]` DELETE already blocks an admin from deleting *themselves* — decide if role changes need the same guard, and why.)
- `prisma.user.update({ where: { id }, data: { role } })`.
- Return the updated user (minus password — see how `register/route.ts` strips `password` before responding, using destructuring: `const { password, ...safeUser } = user`).
- Frontend: add a role `<Select>` next to the existing status `<Select>` on `src/app/(app)/admin/users/page.tsx` — it already has the exact dropdown pattern to copy for status.

**B. System logs — read this before starting, it's not just a route**

This is the one item on the whole original README that genuinely doesn't exist in any form — not under a different name, not partially. Building it "for real" means:

1. **A new Prisma model** (schema migration required):
   ```
   model AuditLog {
     id String @id @default(uuid())
     userId String?
     action String        // e.g. "user.login", "exam.published", "user.deleted"
     details String?
     createdAt DateTime @default(now())
     user User? @relation(fields: [userId], references: [id])
   }
   ```
   ⚠️ Before running a migration: this project's migration history has a known drift issue (an untracked `playing_with_neon` table already in the database that isn't part of the schema). `prisma migrate dev` will try to reset the whole database over this. Use `prisma db push` first and see what it reports — if it also complains about that table, use `prisma db execute --file <path-to-a-.sql-file>` with a plain `CREATE TABLE` statement instead, so you touch only the new table. Ask if you get stuck here; this is exactly the situation to be careful, not fast.

2. **Actually writing log entries.** A log with nothing in it is useless — this is the part that's easy to underestimate. You'd need to add a `prisma.auditLog.create(...)` call inside every route you want tracked. Realistically, start small: just login (`src/app/api/login/route.ts` and the `authorize()` function in `src/lib/auth.ts`), register, and maybe user deletion/status changes. Trying to instrument *everything* on day one is how this kind of feature never ships — pick 3–4 meaningful events first.

3. **The read route**, `GET /api/admin/logs` — once entries exist, this part is easy: paginated `findMany`, admin-only, same shape as `get-all-users`.

4. **Frontend**: `src/app/(app)/admin/logs/page.tsx` already exists, but it's currently an honest placeholder (it says outright "there isn't a real system-logs feature built yet" and shows recent signups as the closest available substitute). Once the real API exists, swap that placeholder fetch for the new one.

If this feels like too much right now, it's reasonable to build **A** (role change) and skip **B** until later — a real audit-log system is genuinely a separate project, not an afternoon task.

---

## Suggested order to actually do this in

1. **Admin: role change** — smallest, most self-contained, good warm-up.
2. **Violations: generic `POST /api/violations` + `GET /api/violations/[attemptId]`** — reuses concepts you've already implemented before (attempt ownership checks, the grading loop).
3. **Analytics: student performance** — one new query, moderate join.
4. **Analytics: question performance** — the `groupBy` makes this the most technically interesting one; save it for when the others feel comfortable.
5. **Frontend: the 3 new client-side violation detectors** — quick once the backend exists.
6. **Admin: audit logs** — only if you want to take on a schema migration + multi-route instrumentation project. Treat it as separate from the rest.

Come back with questions on any specific step, or if you want me to review what you've written once you've got a route working.
