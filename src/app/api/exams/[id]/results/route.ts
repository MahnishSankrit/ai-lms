
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";  
import { completeExpiredExams } from "@/lib/exam-status";
import { NextResponse } from "next/server";


/**
 * @swagger
 * /api/exams/{id}/results:
 *   get:
 *     tags: [Exams]
 *     summary: Teacher (owner) views aggregate statistics and per-student attempts for an exam
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exam stats (totalAttempts, averageScore, highestScore, lowestScore, passcount, failcount) and per-attempt list
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the exam's creator
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)

        // close exams whose end time has passed, so the status shown is current
        await completeExpiredExams();
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
                id: examId
            },
            include:{
                attempts: {
                    include:{
                        student: {
                            select: {
                                id: true,
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
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        // With no pass mark there is no pass/fail -- send null, not "0 passed"
        let passcount: number | null = null;
        let failcount: number | null = null;
        if (exam.passingMarks !== null) {
            const passingMarks = exam.passingMarks;
            passcount = scores.filter((score) => score >= passingMarks).length;
            failcount = scores.length - passcount;
        }

        return NextResponse.json(
            {
                exam: {
                    id: exam.id,
                    title: exam.title,
                    status: exam.status,
                    totalMarks: exam.totalMarks,
                    passingMarks: exam.passingMarks,
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




