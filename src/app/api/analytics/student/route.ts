import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/analytics/student:
 *   get:
 *     tags: [Analytics]
 *     summary: Teacher views one student's performance across all of the teacher's own exams
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Attempt-by-attempt breakdown and summary stats
 *       400:
 *         description: Missing studentId
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       404:
 *         description: No submitted attempts found for this student under your exams
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        if (!studentId) {
            return NextResponse.json(
                { error: "studentId is required" },
                { status: 400 }
            );
        }

        // Only exams this teacher created -- a teacher shouldn't be able to
        // pull a student's performance on another teacher's exams.
        const attempts = await prisma.examAttempt.findMany({
            where: {
                studentId,
                status: "submitted",
                exam: {
                    createdById: session.user.id,
                },
            },
            include: {
                exam: {
                    select: {
                        id: true,
                        title: true,
                        totalMarks: true,
                        passingMarks: true,
                    },
                },
            },
            orderBy: {
                submittedAt: "desc",
            },
        });

        if (attempts.length === 0) {
            return NextResponse.json(
                { error: "No results found for this student" },
                { status: 404 }
            );
        }

        let totalPercentage = 0;
        let passCount = 0;

        const attemptSummaries = attempts.map((attempt) => {
            const score = attempt.score ?? 0;
            const percentage = attempt.exam.totalMarks > 0 ? (score / attempt.exam.totalMarks) * 100 : 0;
            const pass = attempt.exam.passingMarks !== null ? score >= attempt.exam.passingMarks : true;

            totalPercentage += percentage;
            if (pass) passCount += 1;

            return {
                attemptId: attempt.id,
                examId: attempt.exam.id,
                examTitle: attempt.exam.title,
                score,
                totalMarks: attempt.exam.totalMarks,
                percentage: Number(percentage.toFixed(2)),
                pass,
                submittedAt: attempt.submittedAt,
            };
        });

        return NextResponse.json(
            {
                totalAttempts: attempts.length,
                averagePercentage: Number((totalPercentage / attempts.length).toFixed(2)),
                passCount,
                failCount: attempts.length - passCount,
                attempts: attemptSummaries,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching student analytics:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
