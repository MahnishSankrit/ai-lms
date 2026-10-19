// Global search used by the search box in the top bar (Ctrl+K).
// Searches classrooms, exams and results by name, but ONLY the ones the
// logged-in user is allowed to see:
// - student: classrooms they joined, exams in those classrooms, their own results
// - teacher: classrooms they own, exams they created, results of those exams
// Each item comes back with a `href` so the dropdown can link straight to it.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchItem = {
    id: string;
    title: string;
    subtitle: string;
    href: string;
};

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags: [Search]
 *     summary: Search the user's own classrooms, exams and results by name
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "{ classrooms, exams, results } -- each a list of { id, title, subtitle, href }"
 *       401:
 *         description: Not logged in
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = (searchParams.get("q") || "").trim();

        const classrooms: SearchItem[] = [];
        const exams: SearchItem[] = [];
        const results: SearchItem[] = [];

        // Need at least 2 letters, otherwise almost everything matches.
        if (query.length < 2) {
            return NextResponse.json({ classrooms, exams, results });
        }

        const userId = session.user.id;
        // "contains" + "insensitive" = name includes the text, ignoring upper/lower case.
        const nameMatches = { contains: query, mode: "insensitive" as const };

        if (session.user.role === "student") {
            // 1. Classrooms the student joined
            const foundClassrooms = await prisma.classroom.findMany({
                where: { name: nameMatches, members: { some: { userId } } },
                take: 5,
            });
            for (const classroom of foundClassrooms) {
                classrooms.push({
                    id: classroom.id,
                    title: classroom.name,
                    subtitle: classroom.subject || "Classroom",
                    href: `/student/classrooms/${classroom.id}`,
                });
            }

            // 2. Published exams in classrooms the student joined
            const foundExams = await prisma.exam.findMany({
                where: {
                    title: nameMatches,
                    status: "published",
                    classroom: { members: { some: { userId } } },
                },
                include: { classroom: true },
                take: 5,
            });
            for (const exam of foundExams) {
                exams.push({
                    id: exam.id,
                    title: exam.title,
                    subtitle: exam.classroom.name,
                    href: `/student/exams/${exam.id}`,
                });
            }

            // 3. The student's own finished attempts
            const foundAttempts = await prisma.examAttempt.findMany({
                where: {
                    studentId: userId,
                    status: { in: ["submitted", "auto_submitted"] },
                    exam: { title: nameMatches },
                },
                include: { exam: true },
                orderBy: { submittedAt: "desc" },
                take: 5,
            });
            for (const attempt of foundAttempts) {
                results.push({
                    id: attempt.id,
                    title: attempt.exam.title,
                    subtitle: `Score: ${attempt.score ?? 0} / ${attempt.exam.totalMarks}`,
                    href: `/student/exams/${attempt.examId}/results?attemptId=${attempt.id}`,
                });
            }
        }

        if (session.user.role === "teacher") {
            // 1. Classrooms the teacher owns
            const foundClassrooms = await prisma.classroom.findMany({
                where: { name: nameMatches, ownerId: userId },
                take: 5,
            });
            for (const classroom of foundClassrooms) {
                classrooms.push({
                    id: classroom.id,
                    title: classroom.name,
                    subtitle: classroom.subject || "Classroom",
                    href: `/teacher/classrooms/${classroom.id}`,
                });
            }

            // 2. Exams the teacher created. Each one is shown twice:
            //    once as an exam (to edit) and once as results (to review).
            const foundExams = await prisma.exam.findMany({
                where: { title: nameMatches, createdById: userId },
                include: { classroom: true },
                take: 5,
            });
            for (const exam of foundExams) {
                exams.push({
                    id: exam.id,
                    title: exam.title,
                    subtitle: `${exam.classroom.name} · ${exam.status}`,
                    href: `/teacher/exams/${exam.id}/edit`,
                });
                results.push({
                    id: exam.id,
                    title: exam.title,
                    subtitle: "View results",
                    href: `/teacher/exams/${exam.id}/results`,
                });
            }
        }

        return NextResponse.json({ classrooms, exams, results });
    } catch (error) {
        console.error("Error searching:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
