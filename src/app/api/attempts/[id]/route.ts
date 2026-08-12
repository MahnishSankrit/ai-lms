import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Authentication
// ↓
// Get Attempt ID
// ↓
// Find Attempt
// ↓
// Include Exam
// ↓
// Include Answers
// ↓
// Include Violations
// ↓
// Attempt Exists?
// ↓
// Student?
// ↓
// Own Attempt?
// ↓
// Teacher?
// ↓
// Own Exam?
// ↓
// Return Attempt



/**
 * @swagger
 * /api/attempts/{id}:
 *   get:
 *     tags: [Attempts]
 *     summary: Fetch full attempt detail (exam, answers with question data, violations)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Attempt detail
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Student who isn't the attempt owner, or teacher who doesn't own the exam
 *       404:
 *         description: Attempt not found
 */
export async function GET(req: Request,{ params }: { params: Promise<{ id: string }> }) {
    try {


        // STEP 1: AUTHENTICATION

        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // STEP 2: GET ATTEMPT ID

        const attemptId = (await params).id;

        // STEP 3: FIND ATTEMPT WITH RELATIONS

        const attempt =
            await prisma.examAttempt.findUnique({
                where: {
                    id: attemptId,
                },

                include: {
                    exam: true,

                    answers: {
                        include: {
                            question: {
                                include: {
                                    options: true,
                                },
                            },
                        },
                    },

                    violations: true,

                    student: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

        // STEP 4: ATTEMPT EXISTS?

        if (!attempt) {
            return NextResponse.json(
                {
                    error: "Attempt not found",
                },
                {
                    status: 404,
                }
            );
        }

        // STEP 5: STUDENT ACCESS

        if (session.user.role === "student") {

            if (
                attempt.studentId !==
                session.user.id
            ) {
                return NextResponse.json(
                    {
                        error: "Forbidden",
                    },
                    {
                        status: 403,
                    }
                );
            }
        }

        // STEP 6: TEACHER ACCESS

        if (session.user.role === "teacher") {

            if (
                attempt.exam.createdById !==
                session.user.id
            ) {
                return NextResponse.json(
                    {
                        error: "Forbidden",
                    },
                    {
                        status: 403,
                    }
                );
            }
        }

        // STEP 7: RETURN ATTEMPT

        return NextResponse.json(
            {
                attempt,
            },
            {
                status: 200,
            }
        );

    } catch (error) {

        console.error(
            "Error fetching attempt:",
            error
        );

        return NextResponse.json(
            {
                error: "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }
}