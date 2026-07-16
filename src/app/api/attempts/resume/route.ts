import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/attempts/resume:
 *   post:
 *     tags: [Attempts]
 *     summary: Student resumes an in-progress attempt; returns remaining time; auto-submits if time expired
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [examId]
 *             properties:
 *               examId: { type: string }
 *     responses:
 *       200:
 *         description: Attempt resumed successfully (attemptId, remainingMinutes, answers)
 *       400:
 *         description: Missing examId; attempt already submitted; or time expired (auto-transitions to auto_submitted)
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a student
 *       404:
 *         description: Exam not found, or no attempt exists yet (call start first)
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
    try {

        // ==========================================
        // STEP 1: AUTHENTICATION
        // ==========================================

        const session =
            await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        // ==========================================
        // STEP 2: STUDENT CHECK
        // ==========================================

        if (
            session.user.role !== "student"
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

        // ==========================================
        // STEP 3: GET EXAM ID
        // ==========================================

        const body = await req.json();

        const { examId } = body;

        if (!examId) {
            return NextResponse.json(
                {
                    error: "Exam id is required",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // STEP 4: FIND EXAM
        // ==========================================

        const exam =
            await prisma.exam.findUnique({
                where: {
                    id: examId,
                },
            });

        if (!exam) {
            return NextResponse.json(
                {
                    error: "Exam not found",
                },
                {
                    status: 404,
                }
            );
        }

        // ==========================================
        // STEP 5: FIND STUDENT'S ATTEMPT
        // ==========================================

        const attempt =
            await prisma.examAttempt.findFirst({
                where: {
                    examId,
                    studentId:
                        session.user.id,
                },

                include: {
                    answers: true,
                },
            });

        if (!attempt) {
            return NextResponse.json(
                {
                    error:
                        "No attempt found",
                },
                {
                    status: 404,
                }
            );
        }

        // ==========================================
        // STEP 6: ATTEMPT MUST BE ACTIVE
        // ==========================================

        if (
            attempt.status !==
            "in_progress"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Attempt already submitted",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // STEP 7: CALCULATE ELAPSED TIME
        // ==========================================

        const now = new Date();

        const elapsedMilliseconds =
            now.getTime() -
            attempt.startedAt.getTime();

        const elapsedMinutes =
            Math.floor(
                elapsedMilliseconds /
                1000 /
                60
            );

        // ==========================================
        // STEP 8: CALCULATE REMAINING TIME
        // ==========================================

        const remainingMinutes =
            Math.max(
                exam.durationMinutes -
                elapsedMinutes,
                0
            );

        // ==========================================
        // STEP 9: AUTO SUBMIT IF TIME ENDED
        // ==========================================

        if (remainingMinutes <= 0) {

            await prisma.examAttempt.update({
                where: {
                    id: attempt.id,
                },

                data: {
                    status:
                        "auto_submitted",

                    submittedAt:
                        new Date(),
                },
            });

            return NextResponse.json(
                {
                    error:
                        "Exam time expired",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // STEP 10: RETURN ATTEMPT STATE
        // ==========================================

        return NextResponse.json(
            {
                message:
                    "Attempt resumed successfully",

                attemptId:
                    attempt.id,

                remainingMinutes,

                answers:
                    attempt.answers,
            },
            {
                status: 200,
            }
        );

    } catch (error) {

        console.error(
            "Error resuming attempt:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }


}
