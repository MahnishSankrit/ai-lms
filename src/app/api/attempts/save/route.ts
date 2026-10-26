import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/grading";
import { isAttemptExpired } from "@/lib/attempt-time";




/**
 * @swagger
 * /api/attempts/save:
 *   post:
 *     tags: [Attempts]
 *     summary: Student saves/updates one answer during an in-progress attempt (autosave)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attemptId, questionId]
 *             properties:
 *               attemptId: { type: string }
 *               questionId: { type: string }
 *               selectedOptionId: { type: string, description: "For mcq/multiple_select/true_false questions" }
 *               answerText: { type: string, description: "For short_answer questions" }
 *     responses:
 *       200:
 *         description: Answers saved successfully
 *       401:
 *         description: Not logged in
 *       400:
 *         description: Missing fields, attempt already submitted, time expired (attempt gets auto-submitted), question not in this exam, or option not in this question
 *       403:
 *         description: Not a student, or attempt doesn't belong to you
 *       404:
 *         description: Attempt not found
 *       500:
 *         description: Invalid questionId/selectedOptionId, or other server error
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        if (session.user.role !== "student") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const body = await req.json();
        const { attemptId, selectedOptionId, answerText, questionId } = body;

        if (!attemptId || !questionId) {
            return NextResponse.json(
                { error: "attemptId and questionId are required" },
                { status: 400 }
            )
        }

        // get the exam attempt and verify ownership
        const examAttempt = await prisma.examAttempt.findUnique({
            where: {
                id: attemptId,
            },
            include: {
                exam: true,
            }
        })

        if (!examAttempt) {
            return NextResponse.json(
                { error: "Attempt not found" },
                { status: 404 }
            )
        }
        // verifying the ownership of the attempt
        if (examAttempt.studentId !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden, you are not the owner of this attempt" },
                { status: 403 }
            )
        }

        // answers can't be changed once the attempt is submitted
        if (examAttempt.status !== "in_progress") {
            return NextResponse.json(
                { error: "Attempt already submitted" },
                { status: 400 }
            )
        }

        // time is checked on the server, not just by the browser timer.
        // If time is up, submit with the answers saved so far.
        if (isAttemptExpired(examAttempt.startedAt, examAttempt.exam)) {
            const finalScore = await gradeAttempt(attemptId);
            await prisma.examAttempt.update({
                where: { id: attemptId },
                data: {
                    status: "auto_submitted",
                    score: finalScore,
                    submittedAt: new Date(),
                },
            });
            return NextResponse.json(
                { error: "Exam time expired" },
                { status: 400 }
            )
        }

        // the question must be part of THIS exam
        const examQuestion = await prisma.examQuestion.findFirst({
            where: {
                examId: examAttempt.examId,
                questionId: questionId,
            }
        })
        if (!examQuestion) {
            return NextResponse.json(
                { error: "Question is not part of this exam" },
                { status: 400 }
            )
        }

        // the picked option must belong to THIS question
        // (otherwise a student could send a known-correct option id
        // from another question as the answer to every question)
        if (selectedOptionId) {
            const option = await prisma.questionOption.findFirst({
                where: {
                    id: selectedOptionId,
                    questionId: questionId,
                }
            })
            if (!option) {
                return NextResponse.json(
                    { error: "Option does not belong to this question" },
                    { status: 400 }
                )
            }
        }

        // upsert the answers for the attempt
        await prisma.attemptAnswer.upsert({
            where:{
                attemptId_questionId: {
                    attemptId: attemptId,
                    questionId: questionId, 
                }
            
            },
            create:{
                attemptId: attemptId,
                selectedOptionId: selectedOptionId,
                answerText: answerText,
                questionId: questionId,
                updatedAt: new Date(),
            },
            update:{
                selectedOptionId: selectedOptionId,
                answerText: answerText,
            }
        })


        return NextResponse.json(
            { message: "Answers saved successfully", attemptId },
            { status: 200 }
        )



    } catch (error) {
        console.error("Error saving answers:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}


