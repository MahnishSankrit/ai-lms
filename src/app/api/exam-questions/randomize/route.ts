import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";



// Teacher
//  ↓
// Auth
//  ↓
// Ownership Check
//  ↓
// Fetch Exam Questions
//  ↓
// Shuffle Array
//  ↓
// Assign New Orders
//  ↓
// Save Orders
//  ↓
// Success
/**
 * @swagger
 * /api/exam-questions/randomize:
 *   post:
 *     tags: [Exam Questions]
 *     summary: Shuffle the order of all questions attached to an exam
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
 *         description: Questions randomized successfully
 *       400:
 *         description: Missing examId
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the exam's owner
 *       404:
 *         description: Exam not found, or exam has no attached questions
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
    try {
        // Authentication
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Teacher Check
        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // Request Body
        const body = await req.json();
        const { examId } = body;

        if (!examId) {
            return NextResponse.json(
                { error: "Exam id is required" },
                { status: 400 }
            );
        }

        // Find Exam
        const exam = await prisma.exam.findUnique({
            where: {
                id: examId,
            },
        });

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            );
        }

        // Ownership Check
        if (exam.createdById !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // Get all questions attached to exam
        const examQuestions = await prisma.examQuestion.findMany({
            where: {
                examId,
            },
            orderBy: {
                order: "asc",
            },
        });

        if (examQuestions.length === 0) {
            return NextResponse.json(
                { error: "No questions found in this exam" },
                { status: 404 }
            );
        }

        // Fisher-Yates Shuffle
        for (let i = examQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [examQuestions[i], examQuestions[j]] = [
                examQuestions[j],
                examQuestions[i],
            ];
        }

        // Update orders in transaction
        await prisma.$transaction(
            examQuestions.map((question, index) =>
                prisma.examQuestion.update({
                    where: {
                        id: question.id,
                    },
                    data: {
                        order: index + 1,
                    },
                })
            )
        );

        return NextResponse.json(
            {
                message: "Questions randomized successfully",
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error("Error randomizing questions:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}