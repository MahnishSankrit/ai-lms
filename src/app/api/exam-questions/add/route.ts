import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";
import { recalculateTotalMarks } from "@/lib/grading";

// this api is creaing the  realtionship between the exam and the question, so that the question can be added to the exam
// It creates a record in the ExamQuestion junction table, linking an existing question to an existing exam. Before creating the relationship,
//  the API verifies authentication, ownership of both the exam and question, validates existence of both entities, prevents duplicate mappings, and assigns the correct order within the exam.

/**
 * @swagger
 * /api/exam-questions/add:
 *   post:
 *     tags: [Exam Questions]
 *     summary: Attach an existing question (owned by you) to an existing exam (owned by you)
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
 *               quesId: { type: string, description: "Add one question" }
 *               quesIds: { type: array, items: { type: string }, description: "Add many questions at once (1-1000); ones already in the exam are skipped" }
 *     responses:
 *       200:
 *         description: Question(s) added. Single mode returns createExam (createExam.id is the examQuestionId); bulk mode returns addedCount and skippedCount
 *       400:
 *         description: Question already attached to this exam (single mode), or invalid quesIds
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher; not the exam's creator; or not the question's creator
 *       404:
 *         description: Exam not found, or question not found
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
            )
        }

        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const { examId, quesId, quesIds } = await req.json();
        const teacherId = session.user.id;

        // BULK MODE: quesIds = [...] adds many questions in one request
        // (the "Select all" / "Add selected" buttons on the edit exam page)
        if (quesIds !== undefined) {
            if (!teacherId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            }
            return addManyQuestions(examId, quesIds, teacherId);
        }

        // find the exam;
        const exam = await prisma.exam.findUnique({
            where: {
                id: examId,
            }
        })

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            )
        }

        if (exam.createdById !== teacherId) {
            return NextResponse.json(
                { error: "Forbidden, you are not the creator of this exam" },
                { status: 403 }
            )
        }

        // find the question;
        const question = await prisma.question.findUnique({ where: { id: quesId } });
        if (!question) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 })
        }
        // const question = await prisma.question.findUnique({
        //     where: {
        //         id: quesId,
        //     }
        // })

        if (!question) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            )
        }

        // checkng the owernship of the question
        if (question.createdById !== teacherId) {
            return NextResponse.json(
                { error: "Forbidden, you are not the creator of this question" },
                { status: 403 }
            )
        }

        // checking the duplication attachement althpugh the schema handles it but still i am checking it here to avoid the duplication of the question in the exam
        const existing = await prisma.examQuestion.findFirst({
            where: {
                examId,
                questionId: question.id
            }
        })

        if (existing) {
            return NextResponse.json(
                { error: "Question already added to this exam" },
                { status: 400 }
            )
        }

        // create the exam question
        const createExam = await prisma.examQuestion.create({
            data: {
                examId,
                questionId: question.id,
                order: 1,
            }
        })

        if (!createExam) {
            return NextResponse.json(
                { error: "Failed to add question to exam" },
                { status: 500 }
            )
        }

        // keep exam.totalMarks in sync with the questions actually attached
        await recalculateTotalMarks(examId);

        return NextResponse.json(
            { message: "Question added to exam successfully", createExam },
            { status: 200 }
        )

    } catch (error) {
        console.error("Error adding question to exam:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}

// Same checks as adding one question (own the exam, own every question),
// but for a list. Questions already in the exam are skipped, not errors.
async function addManyQuestions(examId: string, quesIds: unknown, teacherId: string) {
    if (!Array.isArray(quesIds) || quesIds.length === 0 || quesIds.length > 1000) {
        return NextResponse.json(
            { error: "quesIds must be a list of 1 to 1000 question ids" },
            { status: 400 }
        )
    }
    if (!quesIds.every((id) => typeof id === "string")) {
        return NextResponse.json(
            { error: "quesIds must only contain question ids" },
            { status: 400 }
        )
    }
    const uniqueIds = [...new Set(quesIds as string[])];

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }
    if (exam.createdById !== teacherId) {
        return NextResponse.json(
            { error: "Forbidden, you are not the creator of this exam" },
            { status: 403 }
        )
    }

    // Every id must be a question this teacher created
    const ownedCount = await prisma.question.count({
        where: { id: { in: uniqueIds }, createdById: teacherId },
    });
    if (ownedCount !== uniqueIds.length) {
        return NextResponse.json(
            { error: "Some questions were not found or are not yours" },
            { status: 403 }
        )
    }

    // New questions go after the ones already in the exam
    const existingCount = await prisma.examQuestion.count({ where: { examId } });

    // skipDuplicates: questions already in this exam are ignored
    // (the @@unique([examId, questionId]) rule stops doubles)
    const result = await prisma.examQuestion.createMany({
        data: uniqueIds.map((questionId, index) => ({
            examId,
            questionId,
            order: existingCount + index + 1,
        })),
        skipDuplicates: true,
    });

    // one recalculation for the whole batch
    await recalculateTotalMarks(examId);

    return NextResponse.json(
        {
            message: `${result.count} question(s) added to exam`,
            addedCount: result.count,
            skippedCount: uniqueIds.length - result.count,
        },
        { status: 200 }
    )
}



