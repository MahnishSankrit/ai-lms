

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeExpiredExams } from "@/lib/exam-status";
// import { createExamSchema } from "@/validation/exam.schema";



/**
 * @swagger
 * /api/exams/get-exams:
 *   get:
 *     tags: [Exams]
 *     summary: List exams (teacher's own, or student's published/enrolled exams)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of exams
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Role is neither teacher nor student
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // close exams whose end time has passed, so the status shown is current
        await completeExpiredExams();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        if (session.user.role === "teacher") {
            const exams = await prisma.exam.findMany({
                where: {
                    createdById: session.user.id,
                },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            email: true,
                        }
                    },

                    classroom: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },

                    // for the cards on the Exams / Results pages
                    _count: {
                        select: { questions: true },
                    },
                    attempts: {
                        select: { score: true },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                }
            })

            // Add simple stats to each exam, using the same rules as
            // /api/exams/[id]/results: only graded attempts (score not null)
            // count, pass = score >= passingMarks, and no pass mark = no pass rate.
            const examsWithStats = exams.map(({ attempts, _count, ...exam }) => {
                const scores: number[] = [];
                for (const attempt of attempts) {
                    if (attempt.score !== null) {
                        scores.push(attempt.score);
                    }
                }

                let averagePercentage: number | null = null;
                if (scores.length > 0 && exam.totalMarks > 0) {
                    const total = scores.reduce((sum, score) => sum + score, 0);
                    averagePercentage = (total / scores.length / exam.totalMarks) * 100;
                }

                let passRate: number | null = null;
                if (scores.length > 0 && exam.passingMarks !== null) {
                    const passingMarks = exam.passingMarks;
                    const passed = scores.filter((score) => score >= passingMarks).length;
                    passRate = (passed / scores.length) * 100;
                }

                return {
                    ...exam,
                    questionCount: _count.questions,
                    attemptCount: attempts.length,
                    averagePercentage,
                    passRate,
                };
            });

            return NextResponse.json(
                { exams: examsWithStats },
                { status: 200 }
            )
        }
        if (session.user.role === "student") {
            const exams = await prisma.exam.findMany({
                where: {
                    // "published" (not started yet) or "ongoing" (teacher
                    // clicked Start) both mean the student can see/take it.
                    status: { in: ["published", "ongoing"] },
                    classroom: {
                        members: {
                            some: {
                                userId: session.user.id,
                            }
                        }
                    }
                },
                // Only what a student needs. Never send accessCode (that's
                // the secret the teacher shares separately), passingMarks,
                // negativeMarking, createdById or other teacher-only config.
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    durationMinutes: true,
                    totalMarks: true,
                    startsAt: true,
                    endsAt: true,
                    fullscreenRequired: true,
                    accessCode: true, // read here only to work out requiresAccessCode below
                    createdAt: true,
                    classroom: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
                orderBy: {
                    createdAt: "desc",
                }
            })

            const studentExams = exams.map(({ accessCode, ...exam }) => ({
                ...exam,
                requiresAccessCode: Boolean(accessCode),
            }));

            return NextResponse.json(
                { exams: studentExams },
                { status: 200 }
            )
        }

        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        )

    } catch (error) {
        console.error("Error in fetching exams:", error);
        return NextResponse.json(
            { error: "Failed to fetch exams" },
            { status: 500 }
        )
    }
}
