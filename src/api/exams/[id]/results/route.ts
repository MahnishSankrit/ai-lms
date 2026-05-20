
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";  
import { NextResponse } from "next/server";


export async function GET(req: Request, { params }: { params: { id: string } }) {
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
                id: examId
            },
            include:{
                attempts: {
                    include:{
                        student: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        },
                    }
                }
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

        const attempts = exam.attempts;
        const scores = attempts
            .map((attempt) => attempt.score)
            .filter((score): score is number => score !== null);

        // aggregation
        const totalAttempts = attempts.length;
        const averageScore =
            totalAttempts > 0
                ? scores.reduce((a, b) => a + b, 0) / totalAttempts
                : 0;
        const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
        const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0;

        const passcount = attempts.filter(
            (attempt) =>
                attempt.score !== null &&
                exam.passingMarks !== null &&
                attempt.score >= exam.passingMarks
        ).length;
        const failcount = totalAttempts - passcount;

        return NextResponse.json(
            {
                exam: {
                    id: exam.id,
                    title: exam.title,
                    status: exam.status,
                },
                statistic: {
                    totalAttempts,
                    averageScore,
                    highestScore,
                    lowestScore,
                    passcount,
                    failcount,
                },
                attempts: attempts.map((attempt) => ({
                    id: attempt.id,
                    student: attempt.student,
                    score: attempt.score,
                    status: attempt.status,
                    submittedAt: attempt.submittedAt,
                    startedAt: attempt.startedAt,
                })),
            },
            { status: 200 }
        )



    } catch (error) {
        console.error("Error in fetching exam results:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}




