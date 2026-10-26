import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/grading";
import { getRemainingSeconds } from "@/lib/attempt-time";

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

        //  CALCULATE ELAPSED TIME

        // Deadline = min(startedAt + duration, exam endsAt) -- see lib/attempt-time.ts.
        // Counted in seconds, so a refresh doesn't hand out up to 59 free seconds.
        const remainingSeconds = getRemainingSeconds(attempt.startedAt, exam);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);

        //  AUTO SUBMIT IF TIME ENDED


        if (remainingSeconds <= 0) {

            // Same grading used by a normal submit -- otherwise an attempt
            // that times out (student closes the tab and never reopens it
            // before the timer runs out client-side) would be marked done
            // but stay ungraded with score stuck at null forever.
            const finalScore =
                await gradeAttempt(attempt.id);

            await prisma.examAttempt.update({
                where: {
                    id: attempt.id,
                },

                data: {
                    status:
                        "auto_submitted",

                    score:
                        finalScore,

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

        // RETURN ATTEMPT STATE


        return NextResponse.json(
            {
                message:
                    "Attempt resumed successfully",

                attemptId:
                    attempt.id,

                remainingMinutes,

                remainingSeconds,

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
