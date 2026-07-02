
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// can use the cron job to automatically end the exam when the end time is reached, but for now, we will just create an endpoint to end the exam manually, which can be called by the teacher from the frontend when they want to end the exam, or it can be called by a cron job that runs every minute to check if there are any ongoing exams that have reached their end time and end them automatically

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
                id: examId,
            },
            include:{
                attempts: true,
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
        
        if(exam.status !== "ongoing"){
            return NextResponse.json(
                {error: "Only ongoing exams can be ended"},
                {status: 400}
            )
        }

        // Auto-submit any in-progress attempts, then mark exam completed.
        const activeAttempts = exam.attempts.filter(
            (attempt) => attempt.status === "in_progress"
        );

        if (activeAttempts.length > 0) {
            await prisma.examAttempt.updateMany({
                where: {
                    examId: examId,
                    status: "in_progress",
                },
                data: {
                    status: "auto_submitted",
                    submittedAt: new Date(),
                },
            });
        }

        await prisma.exam.update({
            where: { id: examId },
            data: { status: "completed" },
        });

        return NextResponse.json(
            { message: "Exam ended successfully" },
            { status: 200 }
        );




    } catch (error) {
        console.error("Error in ending exam:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
         )
    }
}



