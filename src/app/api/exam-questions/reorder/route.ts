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


