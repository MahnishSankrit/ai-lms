
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/grading";


// can use the cron job to automatically end the exam when the end time is reached, but for now, we will just create an endpoint to end the exam manually, which can be called by the teacher from the frontend when they want to end the exam, or it can be called by a cron job that runs every minute to check if there are any ongoing exams that have reached their end time and end them automatically

/**
 * @swagger
 * /api/exams/{id}/end:
 *   post:
 *     tags: [Exams]
 *     summary: Teacher (owner) ends an ongoing exam (auto-submits in-progress attempts, marks completed)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exam ended successfully
 *       400:
 *         description: Exam is not currently ongoing
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the exam's creator
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Server error
 */
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
        // Each one needs to be graded individually (updateMany can't run
        // per-row logic), otherwise these attempts would end with score
        // stuck at null forever, same as a manual submit would compute.
        const activeAttempts = exam.attempts.filter(
            (attempt) => attempt.status === "in_progress"
        );

        for (const attempt of activeAttempts) {
            const finalScore = await gradeAttempt(attempt.id);

            await prisma.examAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: "auto_submitted",
                    score: finalScore,
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



