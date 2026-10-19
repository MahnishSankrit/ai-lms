// this is for the stiudents dashboard to get the results of the students
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AttemptStatus } from "@prisma/client";
import { getAutoSubmitReason } from "@/lib/attempt-reason";


/**
 * @swagger
 * /api/results/students:
 *   get:
 *     tags: [Results]
 *     summary: Student's own paginated results across all submitted exams
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated results
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a student
 *       404:
 *         description: No submitted results yet
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

        if (session.user.role !== "student") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }


        const studentId = session.user.id;
        // const attempts = await prisma.examAttempt.findMany({
        //     where: {
        //         studentId: studentId,
        //         status: "submitted"
        //     },
        //     include: {
        //         exam: true,
        //         answers: {
        //             include: {
        //                 question: true
        //             }
        //         },
        //         violations: true
        //     }
        // })

        const { searchParams } = new URL(req.url);

        const page = Number(
            searchParams.get("page") || "1"
        );

        const limit = Number(
            searchParams.get("limit") || "10"
        );

        const skip =
            (page - 1) * limit;


        // Auto-submitted attempts (time ran out, violation, teacher ended
        // the exam) are real graded results too, so they're included --
        // otherwise a 2/15 violation attempt would silently vanish and
        // inflate the student's average.
        const finishedStatuses: AttemptStatus[] = ["submitted", "auto_submitted"];

        const attempts =
            await prisma.examAttempt.findMany({

                where: {
                    studentId,
                    status: { in: finishedStatuses }
                },

                skip,

                take: limit,

                orderBy: {
                    submittedAt: "desc"
                },

                include: {
                    exam: {
                        include: {
                            classroom: { select: { id: true, name: true } },
                        },
                    },
                    violations: {
                        orderBy: { createdAt: "asc" },
                    },
                }

            });

        if (!attempts || attempts.length === 0) {
            return NextResponse.json(
                { error: "No results found" },
                { status: 404 }
            );
        }

        const totalAttempts = await prisma.examAttempt.count({
            where: {
                studentId,
                status: { in: finishedStatuses },
            },
        });
        const results = {
            attempts: attempts.map(attempt => ({
                id: attempt.id,
                examId: attempt.examId,
                examTitle: attempt.exam.title,
                classroomId: attempt.exam.classroom.id,
                classroomName: attempt.exam.classroom.name,
                submittedAt: attempt.submittedAt,
                score: attempt.score,
                totalMarks: attempt.exam.totalMarks,
                status: attempt.status,
                percentage:
                    attempt.exam.totalMarks > 0
                        ?
                        (attempt.score ?? 0)
                        /
                        attempt.exam.totalMarks
                        *
                        100
                        :
                        0,
                pass: attempt.exam.passingMarks ? attempt.score! >= attempt.exam.passingMarks : true,
                violations: attempt.violations,
                autoSubmitReason: getAutoSubmitReason(attempt),
            }))
        }

        return NextResponse.json(
            {
                totalAttempts,
                page,
                skip,
                limit,
                totalPages: Math.ceil(totalAttempts / limit),
                results },
            { status: 200 }
        );



    } catch (error) {
        console.error("Error fetching student results:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

