# Feature ideas for AI LMS

This list is grounded in the actual codebase (checked every route under `src/app/api/`, the Prisma schema, and `package.json`) as of 2026-08-03, not a generic LMS wishlist. Features are grouped by how ready they already are, since that changes both the effort and the order you'd want to build them in.

---

## Group 1 — Schema already supports this, but it's never applied

These are the highest-value fixes: a teacher can already configure them when creating an exam, but the setting is silently ignored. Fixing these closes a gap between what the UI promises and what actually happens.

### 1. Apply `shuffleQuestions` / `shuffleOptions`
- **What**: `Exam.shuffleQuestions` and `Exam.shuffleOptions` are captured at creation (`POST /api/exams`) and even copied when duplicating an exam (`/api/exams/[id]/duplicate`), but `GET /api/exams/[id]` (the student-facing question list) always returns questions and options in the same fixed database order.
- **Why**: Right now, checking that box in "Create Exam" does nothing. Shuffling per-student is one of the most basic anti-cheating measures for exams (stops "answer for question 3 is B" being useful info between students), and it's a two-field flag your schema already has — implementing it is mostly a `sort()` in one route.

### 2. Apply `negativeMarking`
- **What**: `Exam.negativeMarking` (e.g. `0.25`) is stored but `/api/attempts/submit` and `/api/attempts/force-submit` only ever award `question.marks` or `0` — a wrong answer never subtracts anything.
- **Why**: Negative marking is a real, commonly-requested exam feature (discourages random guessing). It's already a first-class field in your data model; the grading loop just needs `marksAwarded = isCorrect ? marks : -negativeMarking` instead of `isCorrect ? marks : 0`.

---

## Group 2 — Backend fully built, zero frontend

These routes exist, are implemented, and (mostly) work — they just have no page or button anywhere in the app.

### 3. Manual grading for short-answer questions
- **What**: `PATCH /api/results/manual-grade` lets a teacher override `marksAwarded` for one answer and it correctly recalculates the attempt's total score.
- **Why**: This is the *only* way a `short_answer`-type question can ever get marks — the auto-grader only checks `selectedOptionId` against a `QuestionOption`, so free-text answers currently always score 0 with no way to fix it. Without a UI for this route, short-answer questions are effectively broken. High priority if you use that question type at all.

### 4. "End exam now" for teachers
- **What**: `POST /api/exams/[id]/end` auto-submits every in-progress attempt and marks the exam `completed`. Well-written, handles the edge cases.
- **Why**: Right now an `ongoing` exam can only end when its scheduled `endsAt` passes — a teacher has no way to cut it short (e.g. a mistake in the exam, or class ran out of time). One button on the exam page.

### 5. Duplicate an exam
- **What**: `POST /api/exams/[id]/duplicate` clones an exam (including its settings and attached questions).
- **Why**: Teachers reusing an exam across terms/sections shouldn't have to rebuild it from scratch. Quick win — one button + redirect to the edit page for the new copy.

### 6. Reorder / randomize exam questions
- **What**: `PATCH /api/exam-questions/reorder` and `POST /api/exam-questions/randomize` (plus `POST /api/exams/[id]/randomize`) exist. Currently, `POST /api/exam-questions/add` always inserts new questions at `order: 1`, so question order in an exam is effectively meaningless right now.
- **Why**: Without this, a teacher can't control (or even see) the order students see questions in. A drag-to-reorder list on the exam edit page would fix both the missing UI and the underlying `order: 1` bug.

### 7. Question bank search/filter (server-side)
- **What**: `GET /api/questions/search` supports text search + difficulty/type filters + pagination server-side.
- **Why**: The current Question Bank page filters client-side on whatever page of results happens to be loaded (10 at a time), so searching only searches the visible page, not the whole bank. Swapping to this endpoint makes search actually search everything.

### 8. CSV export of the question bank
- **What**: `POST /api/questions/export` builds a downloadable CSV via `json2csv` (a dependency that's installed but currently used nowhere else).
- **Why**: Backing up or sharing a question bank between teachers/terms is a standard LMS ask, and the hard part (CSV generation) is already done.

### 9. Study-material upload → question generation (the other half of the AI flow)
- **What**: `POST /api/questions/upload` accepts PDF/DOCX/PPTX, stores it on Cloudinary. The AI Generator page currently only handles inline PDF-text extraction (`/api/ai/extract-pdf`), not this persisted-upload path or DOCX/PPTX.
- **Why**: Extends the AI Generator to non-PDF files and lets a teacher re-run generation against a previously uploaded file instead of re-uploading every time.

---

## Group 3 — Fix a documented bug, then build the feature

### 10. Remove a student from a classroom
- **What**: `DELETE /api/classrooms/[id]/remove-member` exists, but its own doc comment admits the bug: it calls `prisma.classroom.delete({ where: { id: membership.id } })` — deleting a *Classroom* using a *ClassroomMember*'s id. This will 500 essentially every time, since a membership id will never match a classroom id.
- **Why**: There's currently no way to remove a student who joined by mistake, graduated, transferred, etc. — the "Students" list on the teacher's classroom page is read-only. Fix: change that line to `prisma.classroomMember.delete({ where: { id: membership.id } })`, then add a "Remove" button next to each student.

---

## Group 4 — Uses a dependency that's installed but completely unused

### 11. Live exam monitoring for teachers
- **What**: `socket.io` / `socket.io-client` are both in `package.json` but never imported anywhere in `src/`. A teacher-facing "live view" of an ongoing exam — who's started, who's submitted, tab-switch violations appearing in real time — is exactly what they're for.
- **Why**: This is the single most "impressive in an interview" feature on this list: real-time updates are a step up from request/response CRUD, and the anti-cheat violation data already exists (`Violation` model, already being written by `force-submit`) — it just isn't surfaced anywhere live. Higher effort than everything above, but a good showcase of a different skill.

---

## Group 5 — New features (from your earlier requests, not yet built)

Carried over from our in-progress roadmap, listed here for completeness:

### 12. Per-classroom leaderboard (student-facing)
Rank a student against classmates in one classroom, aggregated across that classroom's exams. Needs a new endpoint (nothing currently aggregates scores across exams *per classroom, per student*).

### 13. Global leaderboard ("every student on the platform")
Per your earlier answer — one ranking across all students, not scoped to a classroom. Needs a new endpoint too; straightforward once the aggregation shape from #12 exists.

### 14. Exam access code + shareable link
Teacher gets a link + a separate PIN/code students must enter before an attempt can start (`POST /api/attempts/start` would need to check it). Requires a schema migration (new field on `Exam`) — the only feature on this list that touches the database schema.

### 15. Real notifications
The `Notification` model exists and rows are already created (e.g. when a teacher posts an announcement), but there's no `GET /api/notifications` to read them — the bell icon in the topbar is currently a static "you're all caught up" placeholder. Wiring this up would make that real.

### 16. Student progress / analytics charts
Both dashboards currently show a "Chart coming soon" placeholder box. A score-over-time trend line per student (using the already-available `/api/attempts/history` and `/api/results/students` data) would fill that in without needing a new backend endpoint — just a charting approach (note: introducing a chart library is a call worth making deliberately, given the "don't add another UI library" instruction from the redesign work).

---

## Suggested order

If I were prioritizing: **1 → 2 → 10 → 3** (fix the gaps between what the UI promises and what happens, in order of how broken they currently are — #3 in particular means a whole question type is silently unusable), then **4, 5, 6** (quick, self-contained wins), then **12/13** (leaderboards, since you already asked for these), then **11** and **14** last, since they're the most effort (real-time infra, and a schema migration, respectively).
