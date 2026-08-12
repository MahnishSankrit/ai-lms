import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ViolationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/grading";

/**
 * @swagger
 * /api/violations:
 *   post:
 *     tags: [Violations]
 *     summary: Student logs one anti-cheat violation for their in-progress attempt
 *     description: "If the attempt's violation count reaches the exam's maxTabSwitches limit, the attempt is graded and auto-submitted immediately."
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attemptId, type]
 *             properties:
 *               attemptId: { type: string }
 *               type: { type: string, enum: [tab_switch, fullscreen_exit, copy_paste, right_click, window_blur] }
 *               details: { type: string }
 *     responses:
 *       201:
 *         description: Violation logged (autoSubmitted tells you if this ended the attempt)
 *       400:
 *         description: Missing/invalid fields, or attempt not in_progress
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

        const body = await req.json();
        const { attemptId, type, details } = body;

        if (!attemptId || typeof attemptId !== "string") {
            return NextResponse.json(
                { error: "Invalid attempt ID" },
                { status: 400 }
            );
        }

        if (!Object.values(ViolationType).includes(type)) {
            return NextResponse.json(
                { error: "Invalid violation type" },
                { status: 400 }
            );
        }

        const attempt = await prisma.examAttempt.findUnique({
            where: { id: attemptId },
            include: { exam: true },
        });

        if (!attempt) {
            return NextResponse.json(
                { error: "Attempt not found" },
                { status: 404 }
            );
        }

        if (attempt.studentId !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden, you are not the owner of this attempt" },
                { status: 403 }
            );
        }

        if (attempt.status !== "in_progress") {
            return NextResponse.json(
                { error: "Attempt is not in progress" },
                { status: 400 }
            );
        }

        await prisma.violation.create({
            data: {
                attemptId,
                type,
                details,
            },
        });

        const violationCount = await prisma.violation.count({
            where: { attemptId },
        });

        // maxTabSwitches doubles as the overall violation ceiling here,
        // regardless of which specific type tipped it over.
        if (violationCount >= attempt.exam.maxTabSwitches) {
            const score = await gradeAttempt(attemptId);

            await prisma.examAttempt.update({
                where: { id: attemptId },
                data: {
                    status: "auto_submitted",
                    score,
                    submittedAt: new Date(),
                },
            });

            return NextResponse.json(
                {
                    message: "Exam attempt auto-submitted due to multiple violations",
                    autoSubmitted: true,
                    score,
                },
                { status: 201 }
            );
        }

        return NextResponse.json(
            { message: "Violation logged", autoSubmitted: false },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating violation:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
