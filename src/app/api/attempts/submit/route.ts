import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/grading";
import { isAttemptExpired } from "@/lib/attempt-time";


// Student Clicks Submit
//         ↓
// Authentication
//         ↓
// Find Attempt
//         ↓
// Ownership Check
//         ↓
// Attempt Active?
//         ↓
// Load Answers
//         ↓
// Check Each Answer
//         ↓
// Calculate Score
//         ↓
// Update Attempt
//         ↓
// Submitted


/**
 * @swagger
 * /api/attempts/submit:
 *   post:
 *     tags: [Attempts]
 *     summary: Student submits an in-progress attempt; server grades objective answers and computes the score
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
 *     responses:
 *       200:
 *         description: Exam submitted successfully (score returned)
 *       400:
 *         description: Missing attemptId, or attempt not in_progress
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a student, or attempt doesn't belong to you
 *       404:
 *         description: Attempt not found
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
    try {

        // ==================================================
        // STEP 1: AUTHENTICATION
        // ==================================================
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ==================================================
        // STEP 2: AUTHORIZATION (ONLY STUDENTS CAN SUBMIT)
        // ==================================================
        if (session.user.role !== "student") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // ==================================================
        // STEP 3: GET ATTEMPT ID FROM REQUEST BODY
        // ==================================================
        const body = await req.json();
        const { attemptId } = body;

        if (!attemptId) {
            return NextResponse.json(
                { error: "Attempt id is required" },
                { status: 400 }
            );
        }

        // ==================================================
        // STEP 4: FIND ATTEMPT
        // ==================================================
        const attempt = await prisma.examAttempt.findUnique({
            where: {
                id: attemptId,
            },
            include: {
                exam: true,
            },
        });

        if (!attempt) {
            return NextResponse.json(
                { error: "Attempt not found" },
                { status: 404 }
            );
        }

        // ==================================================
        // STEP 5: OWNERSHIP CHECK
        // ONLY THE STUDENT WHO CREATED THE ATTEMPT
        // CAN SUBMIT IT
        // ==================================================
        if (attempt.studentId !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // ==================================================
        // STEP 6: ATTEMPT MUST BE IN PROGRESS
        // ==================================================
        if (attempt.status !== "in_progress") {
            return NextResponse.json(
                { error: "Attempt already submitted" },
                { status: 400 }
            );
        }

        // ==================================================
        // STEP 7-9: GRADE EVERY ANSWER (shared with force-submit
        // and the violations auto-submit path)
        // ==================================================
        const finalScore = await gradeAttempt(attemptId);

        // ==================================================
        // STEP 10: UPDATE ATTEMPT
        // MARK AS SUBMITTED
        // STORE FINAL SCORE
        // A submit after the deadline (+ grace) is recorded as
        // auto_submitted: the student ran out of time. Late answers
        // can't sneak in, because /attempts/save rejects them.
        // ==================================================
        let finalStatus: "submitted" | "auto_submitted" = "submitted";
        if (isAttemptExpired(attempt.startedAt, attempt.exam)) {
            finalStatus = "auto_submitted";
        }

        await prisma.examAttempt.update({
            where: {
                id: attemptId,
            },
            data: {
                status: finalStatus,
                score: finalScore,
                submittedAt: new Date(),
            },
        });

        // ==================================================
        // STEP 11: RETURN RESULT
        // ==================================================
        return NextResponse.json(
            {
                message: "Exam submitted successfully",
                score: finalScore,
            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.error("Error submitting exam:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}