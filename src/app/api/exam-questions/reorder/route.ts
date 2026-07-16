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
// Teacher Check
//  ↓
// Get Exam
//  ↓
// Ownership Check
//  ↓
// Validate New Order
//  ↓
// Update All Rows
//  ↓
// Success

/**
 * @swagger
 * /api/exam-questions/reorder:
 *   patch:
 *     tags: [Exam Questions]
 *     summary: Bulk-update the order field for a set of exam-question links
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [examId, questions]
 *             properties:
 *               examId: { type: string }
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     examQuestionId: { type: string }
 *                     order: { type: number }
 *     responses:
 *       200:
 *         description: Question order updated successfully
 *       400:
 *         description: examId missing, or questions missing/not an array
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the exam's owner
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Any examQuestionId in the array doesn't exist, or other server error
 */
export async function PATCH(req: Request) {
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

        const body = await req.json();

        const { examId, questions } = body;

        if ( !examId ||!questions || !Array.isArray(questions)){
            return NextResponse.json(
                {error: "Invalid request body"},
                {status: 400}
            );
        }

        const exam = await prisma.exam.findUnique({
            where: {
                id: examId,
            }
        });

        if (!exam) {
            return NextResponse.json(
                { error: "Exam question not found" },
                { status: 404 }
            )
        }

        if (exam.createdById !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden, you are not the creator of this exam question" },
                { status: 403 }
            )
        }

        // updating the question order

        // we can do this by usinf this methiod or alsi using the transactions method to update the order of the questions in the exam
        // const updateOrder = await prisma.examQuestion.update({
        //     wherre:{
        //         id: examId,
        //     },
        //     order:
        // })

        await prisma.$transaction(
            questions.map((q) =>
                prisma.examQuestion.update({
                    where: {
                        id: q.examQuestionId,
                    },
                    data: {
                        order: q.order,
                    },
                })
            )
        );


        return NextResponse.json(
            { message: "Question order updated successfully" },
            { status: 200 }
        )



    } catch (error) {
        console.error("Error updating question order:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}


