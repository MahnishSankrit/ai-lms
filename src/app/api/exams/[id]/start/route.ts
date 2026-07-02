import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";  


// workflow state transitions

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const examId = (await params).id;
        const exam = await prisma.exam.findUnique({
            where: {
                id : examId,
            },
            include: {
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

        if(exam.status !== "published"){
            return NextResponse.json(
                {error: "Only published exams can be started"},
                {status: 400}
            )
        }

        
        if(exam.startsAt && exam.endsAt && exam.startsAt >= exam.endsAt){
            return NextResponse.json(
                {error: "Exam start time must be before end time"},
                {status: 400}
            )
        }
        
        await prisma.exam.update({
            where: {
                id: examId,
            },
            data: {
                status: "ongoing",
            }
        })

        return NextResponse.json(
            {message: "Exam started successfully"},
            {status: 200},
        )


    } catch (error) {
        console.error("Error in starting exam:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}

