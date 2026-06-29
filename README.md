This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.





Perfect question.

This is EXACTLY how backend engineers think before building systems.

You should NOT randomly create APIs while building.

You should:

design your API architecture first.

For your project, the APIs should be divided into:

Auth APIs
User APIs
Classroom APIs
Exam APIs
Question APIs
Attempt APIs
Anti-cheat APIs
AI APIs
Analytics APIs
Admin APIs
VERY IMPORTANT

DO NOT build all APIs immediately.

Your system may eventually have:

70–100 APIs

But:
you build them:

module-by-module.
COMPLETE API ARCHITECTURE FOR YOUR PROJECT
1. AUTH APIs
Folder
src/app/api/auth/
APIs
Method	Route	Purpose
POST	/api/register	Student registration
POST	/api/auth/signin	Login
POST	/api/auth/signout	Logout
GET	/api/auth/session	Current session
GET	/api/verify-email	Verify email
POST	/api/forgot-password	Send reset link
POST	/api/reset-password	Reset password
POST	/api/teacher-invite	Invite teacher
POST	/api/teacher-register	Teacher signup
PRIORITY

Build FIRST.

2. USER APIs
Folder
src/app/api/users/
APIs
Method	Route	Purpose
GET	/api/users/me	Current logged user
PATCH	/api/users/profile	Update profile
GET	/api/users/:id	Get user details
GET	/api/users	Admin user list
PATCH	/api/users/status	Suspend/activate
DELETE	/api/users/:id	Delete user
3. CLASSROOM APIs
Folder
src/app/api/classrooms/
APIs
Method	Route	Purpose
POST	/api/classrooms	Create classroom
GET	/api/classrooms	Get classrooms
GET	/api/classrooms/:id	Classroom details
PATCH	/api/classrooms/:id	Update classroom
DELETE	/api/classrooms/:id	Delete classroom
POST	/api/classrooms/join	Join classroom
POST	/api/classrooms/leave	Leave classroom
GET	/api/classrooms/:id/members	Members list
DELETE	/api/classrooms/:id/remove-member	Remove student
POST	/api/classrooms/:id/announcement	Announcement
PRIORITY

Build AFTER auth.

4. EXAM APIs

THIS is your CORE module.

Folder
src/app/api/exams/
APIs
Method	Route	Purpose
POST	/api/exams	Create exam
GET	/api/exams	List exams
GET	/api/exams/:id	Exam details
PATCH	/api/exams/:id	Update exam
DELETE	/api/exams/:id	Delete exam
POST	/api/exams/:id/publish	Publish exam
POST	/api/exams/:id/unpublish	Unpublish
POST	/api/exams/:id/start	Start exam
POST	/api/exams/:id/end	End exam
POST	/api/exams/:id/duplicate	Clone exam
POST	/api/exams/:id/randomize	Randomize
GET	/api/exams/:id/results	Exam results
VERY IMPORTANT

Your exam entity will become HUGE later.

5. QUESTION APIs
Folder
src/app/api/questions/
APIs
Method	Route	Purpose
POST	/api/questions	Create question
GET	/api/questions	List questions
GET	/api/questions/:id	Question details
PATCH	/api/questions/:id	Update question
DELETE	/api/questions/:id	Delete question
POST	/api/questions/bulk	Bulk upload
GET	/api/questions/search	Search/filter
POST	/api/questions/import	Import CSV/PDF
POST	/api/questions/export	Export questions
6. EXAM QUESTION APIs

Relationship management.

Folder
src/app/api/exam-questions/
APIs
Method	Route	Purpose
POST	/api/exam-questions/add	Add question
DELETE	/api/exam-questions/remove	Remove question
PATCH	/api/exam-questions/reorder	Reorder
POST	/api/exam-questions/randomize	Shuffle
7. ATTEMPT APIs

VERY IMPORTANT MODULE.

This handles:

live exam
autosave
submissions
Folder
src/app/api/attempts/
APIs
Method	Route	Purpose
POST	/api/attempts/start	Start exam
POST	/api/attempts/save	Autosave
POST	/api/attempts/submit	Submit exam
GET	/api/attempts/:id	Attempt details
GET	/api/attempts/history	Attempt history
POST	/api/attempts/resume	Resume exam
POST	/api/attempts/force-submit	Auto submit
THIS MODULE IS CRITICAL

This is where:

timers
anti-cheat
autosave
reconnect

will happen.

8. RESULT APIs
Folder
src/app/api/results/
APIs
Method	Route	Purpose
GET	/api/results/:attemptId	Result
GET	/api/results/student	Student results
GET	/api/results/classroom	Classroom stats
GET	/api/results/leaderboard	Rankings
PATCH	/api/results/manual-grade	Manual grading
9. AI APIs

VERY IMPORTANT.

BUT:
build later.

Folder
src/app/api/ai/

Teacher
   │
   ▼
Upload PDF
   │
   ▼
Upload API
   │
   ▼
PDF Extraction Service
   │
   ▼
Extracted Text
   │
   ▼
AI Question Generation API
   │
   ▼
Teacher Reviews Questions
   │
   ▼
Bulk Save API
   │
   ▼
Question Bank
APIs
Method	Route	Purpose
POST	/api/ai/generate-questions	AI MCQs
POST	/api/ai/generate-answers	AI answers
POST	/api/ai/generate-explanations	AI feedback
POST	/api/ai/extract-pdf	PDF extraction
POST	/api/ai/extract-ppt	PPT extraction
POST	/api/ai/summarize	AI summary
IMPORTANT

These APIs should use:

queues
async workers

NOT direct API processing.

10. FILE APIs
Folder
src/app/api/uploads/
APIs
Method	Route	Purpose
POST	/api/uploads/pdf	Upload PDF
POST	/api/uploads/image	Upload image
DELETE	/api/uploads/:id	Delete file
11. ANTI-CHEAT APIs

One of your BEST modules.

Folder
src/app/api/violations/
APIs
Method	Route	Purpose
POST	/api/violations/tab-switch	Tab switch
POST	/api/violations/fullscreen-exit	Exit fullscreen
POST	/api/violations/copy-paste	Copy/paste
POST	/api/violations/right-click	Right click
GET	/api/violations/:attemptId	Violation logs
POST	/api/violations/auto-submit	Force submit
VERY IMPORTANT

Frontend detects events.

Backend stores them.

12. ANALYTICS APIs
Folder
src/app/api/analytics/
APIs
Method	Route	Purpose
GET	/api/analytics/classroom	Classroom stats
GET	/api/analytics/exam	Exam analytics
GET	/api/analytics/student	Student performance
GET	/api/analytics/question	Question analysis
13. ADMIN APIs
Folder
src/app/api/admin/
APIs
Method	Route	Purpose
GET	/api/admin/users	All users
GET	/api/admin/logs	System logs
PATCH	/api/admin/user-role	Change roles
PATCH	/api/admin/suspend	Suspend user
DELETE	/api/admin/delete-user	Delete user
DEVELOPMENT ORDER (VERY IMPORTANT)

DO NOT BUILD RANDOMLY.

PHASE 1

Build FIRST:

✔ Register
✔ Login
✔ Session
✔ Middleware
✔ Role protection
✔ Email verification
PHASE 2

Then:

✔ Classroom CRUD
✔ Join classroom
✔ Members
PHASE 3

Then:

✔ Exam CRUD
✔ Question CRUD
✔ Exam publishing
PHASE 4

Then:

✔ Attempt APIs
✔ Autosave
✔ Submit
✔ Results
PHASE 5

Then:

✔ AI APIs
✔ File uploads
✔ Parsing
PHASE 6

Then:

✔ Anti-cheat
✔ Analytics
✔ Redis
✔ Workers
IMPORTANT ENGINEERING ADVICE

Each API should follow:

Validation
   ↓
Authentication
   ↓
Authorization
   ↓
Business Logic
   ↓
DB Query
   ↓
Response

THIS is professional backend architecture.

MOST IMPORTANT THING

Right now:

ONLY focus on:
Auth APIs
Classroom APIs

Do NOT jump to:

AI
analytics
sockets
Redis

yet.