import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/attempts/force-submit:
 *   post:
 *     tags: [Attempts]
 *     summary: Force-submit an attempt (e.g. proctoring violation), optionally logging a Violation
 *     description: "No role or ownership check -- any authenticated user can force-submit any in-progress attempt."
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attemptId]
 *             properties:
 *               attemptId: { type: string }
 *               reason: { type: string, description: "If present, logs a Violation with type=tab_switch (hardcoded)", example: "Tab switch detected 3 times" }
 *     responses:
 *       200:
 *         description: Attempt force submitted (score returned)
 *       400:
 *         description: Missing attemptId, or attempt already submitted
 *       401:
 *         description: Not logged in
 *       404:
 *         description: Attempt not found
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
        // STEP 2: GET REQUEST DATA
        // ==========================================

        const body = await req.json();

        const {
            attemptId,
            reason,
        } = body;

        if (!attemptId) {
            return NextResponse.json(
                {
                    error:
                        "Attempt id is required",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // STEP 3: FIND ATTEMPT
        // ==========================================

        const attempt =
            await prisma.examAttempt.findUnique({
                where: {
                    id: attemptId,
                },
            });

        if (!attempt) {
            return NextResponse.json(
                {
                    error:
                        "Attempt not found",
                },
                {
                    status: 404,
                }
            );
        }

        // ==========================================
        // STEP 4: ATTEMPT MUST BE ACTIVE
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
        // STEP 5: LOAD ALL ANSWERS
        // ==========================================

        const answers =
            await prisma.attemptAnswer.findMany({
                where: {
                    attemptId,
                },
            });

        // ==========================================
        // STEP 6: CALCULATE SCORE
        // ==========================================

        let finalScore = 0;

        for (const answer of answers) {

            if (!answer.selectedOptionId) {
                continue;
            }

            const option =
                await prisma.questionOption.findUnique({
                    where: {
                        id:
                            answer.selectedOptionId,
                    },
                });

            if (!option) {
                continue;
            }

            const question =
                await prisma.question.findUnique({
                    where: {
                        id:
                            answer.questionId,
                    },
                });

            if (!question) {
                continue;
            }

            const isCorrect =
                option.isCorrect;

            const marksAwarded =
                isCorrect
                    ? question.marks
                    : 0;

            finalScore += marksAwarded;

            await prisma.attemptAnswer.update({
                where: {
                    attemptId_questionId: {
                        attemptId,
                        questionId:
                            answer.questionId,
                    },
                },

                data: {
                    isCorrect,
                    marksAwarded,
                },
            });
        }

        // ==========================================
        // STEP 7: UPDATE ATTEMPT
        // ==========================================

        await prisma.examAttempt.update({
            where: {
                id: attemptId,
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

        // ==========================================
        // STEP 8: STORE VIOLATION (OPTIONAL)
        // ==========================================

        if (reason) {

            await prisma.violation.create({
                data: {
                    attemptId,

                    type:
                        "tab_switch",

                    details:
                        reason,
                },
            });
        }

        // ==========================================
        // STEP 9: RETURN RESPONSE
        // ==========================================

        return NextResponse.json(
            {
                message:
                    "Attempt force submitted",

                score:
                    finalScore,
            },
            {
                status: 200,
            }
        );

    } catch (error) {

        console.error(
            "Force submit error:",
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
