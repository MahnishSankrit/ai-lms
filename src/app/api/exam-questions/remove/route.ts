import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";

// teacher remove the question fromg the exam

export async function DELETE(req: Request) {
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

        // const body  = await req.json();
        // if(!body){
        //     return NextResponse.json(
        //         {error: "Request body is missing"},
        //         {status: 400}
        //     )
        // }
        const body = await req.json();

        const { examQuestionId } = body;
        if (!examQuestionId) {
            return NextResponse.json(
                { error: "Exam question id is missing" },
                { status: 400 }
            )
        }

        const examQuestion = await prisma.examQuestion.findUnique({
            where: {
                id: examQuestionId,
            }
        })
        if (!examQuestion) {
            return NextResponse.json(
                { error: "Exam question not found" },
                { status: 404 }
            )
        }

        const exam = await prisma.exam.findUnique({
            where: {
                id: examQuestion?.examId,
            }
        })

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            )
        }


        if (exam.createdById !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden, you are not the creator of this exam" },
                { status: 403 }
            )
        }

        // deleting the exam question from the db
        await prisma.examQuestion.delete({
            where: {
                id: examQuestionId,
            }
        })

        return NextResponse.json(
            { message: "Exam question removed successfully" },
            { status: 200 }
        )

    } catch (error) {
        console.error("Error removing exam question:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}


