import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; 
// import { createExamSchema } from "@/validation/exam.schema";
// import { object } from "zod";



export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if(!session){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }

        if(session.user.role !== "teacher"){
            return NextResponse.json(
                {error: "Forbidden"},
                {status: 403}
            )
        }

        const examId = params.id;
        const exam = await prisma.exam.findUnique({
            where: {
                id: examId,
            },
            include:{
                questions: true,
            }
        })

        if(!exam){
            return NextResponse.json(
                {error: "Exam not found"},
                {status: 404}
            )
        }

        if(exam.createdById !== session.user.id){
            return NextResponse.json(
                {error: "Forbidden"},
                {status: 403}
            )
        }

        if(exam.status !== "draft"){
            return NextResponse.json(
                {error: "Only exams in draft state can be published"},
                {status: 400}
            )
        }

        
        // startsAt / endsAt may be null in the DB, guard and compare as Dates
        if (!exam.startsAt || !exam.endsAt) {
            return NextResponse.json(
                { error: "Exam must have both start and end times" },
                { status: 400 }
            );
        }

        if (exam.startsAt.getTime() >= exam.endsAt.getTime()) {
            return NextResponse.json(
                { error: "Exam start time must be before end time" },
                { status: 400 }
            );
        }

        if(exam.questions.length === 0){
            return NextResponse.json(
                {error: "Cannot publish an exam with no questions"},
                {status: 400}
             )
        }

        const publishedExam = await prisma.exam.update({
            where: {
                id: examId,
            },
            data: {
                status: "published",
            }
        })

        return NextResponse.json(
            {message: "Exam published successfully", exam: publishedExam},
            {status: 200}
        )


    } catch (error) {
        console.error("Error in publishing exam:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}

