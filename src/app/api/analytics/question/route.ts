import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/analytics/question:
 *   get:
 *     tags: [Analytics]
 *     summary: Teacher (owner) sees how a question has performed across every graded attempt
 *     description: For mcq/multiple_select questions, also breaks down how often each option was picked -- useful for spotting a misleading wrong answer.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: questionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Question performance stats
 *       400:
 *         description: Missing questionId
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not this question's creator
 *       404:
 *         description: Question not found
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
        const questionId = searchParams.get("questionId");

        if (!questionId) {
            return NextResponse.json(
                { error: "questionId is required" },
                { status: 400 }
            );
        }

        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { options: true },
        });

        if (!question) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        if (question.createdById !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // Only answers that have actually been graded (isCorrect is set)
        // count as "this question was answered".
        const answers = await prisma.attemptAnswer.findMany({
            where: {
                questionId,
                isCorrect: { not: null },
            },
        });

        if (answers.length === 0) {
            return NextResponse.json(
                { error: "No graded attempts for this question yet" },
                { status: 404 }
            );
        }

        const correctCount = answers.filter((answer) => answer.isCorrect).length;
        const correctPercentage = (correctCount / answers.length) * 100;

        // Which option did students pick, and how often -- only meaningful
        // for question types with fixed options.
        const optionBreakdown = await prisma.attemptAnswer.groupBy({
            by: ["selectedOptionId"],
            where: {
                questionId,
                selectedOptionId: { not: null },
            },
            _count: true,
        });

        const optionCounts = optionBreakdown.map((group) => {
            const option = question.options.find((o) => o.id === group.selectedOptionId);
            return {
                optionId: group.selectedOptionId,
                optionText: option?.optionText ?? "(deleted option)",
                isCorrect: option?.isCorrect ?? false,
                timesSelected: group._count,
            };
        });

        return NextResponse.json(
            {
                questionText: question.questionText,
                type: question.type,
                timesAnswered: answers.length,
                correctCount,
                correctPercentage: Number(correctPercentage.toFixed(2)),
                optionCounts,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching question analytics:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
