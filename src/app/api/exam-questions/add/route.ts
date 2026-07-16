import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";

// this api is creaing the  realtionship between the exam and the question, so that the question can be added to the exam
// It creates a record in the ExamQuestion junction table, linking an existing question to an existing exam. Before creating the relationship,
//  the API verifies authentication, ownership of both the exam and question, validates existence of both entities, prevents duplicate mappings, and assigns the correct order within the exam.

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

        const { examId, quesId } = await req.json();
        const teacherId = session.user.id;

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



