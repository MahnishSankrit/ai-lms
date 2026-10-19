

// this api will return the reulsts for the student and the teacher for a given assignment

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


/**
 * @swagger
 * /api/results/{id}:
 *   get:
 *     tags: [Results]
 *     summary: Fetch the final result/report card for one submitted attempt
 *     description: "The path parameter is an attemptId, despite living under /api/results/."
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: attemptId
 *     responses:
 *       200:
 *         description: Result (score, percentage, pass, violations, answers)
 *       400:
 *         description: Attempt hasn't been submitted yet
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Student who isn't the owner; teacher who doesn't own the exam; or unsupported role
 *       404:
 *         description: Attempt not found
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const attemptId = (await params).id;
        const attempt = await prisma.examAttempt.findUnique({
            where: {
                id: attemptId,

            },

            include: {
                exam: true,

                answers: {
                    include: {
                        question: {
                            include: { options: true },
                        },
                    }
                },


                student: true,
                violations: true
            },



        });

        if (!attempt) {
            return NextResponse.json(
                { error: "Attempt not found" },
                { status: 404 }
            );
        }
        // Only finished attempts have a result. Auto-submitted ones are
        // finished and graded too, so they count.
        if (attempt.status === "in_progress") {
            return NextResponse.json(
                { error: "Result is not available yet" },
                { status: 400 }
            );
        }
        // permission check
        // const examId = await prisma.exam.findUnique({
        //     where: {
        //         id: attempt.examId
        //     }
        // });

        // if (!examId) {
        //     return NextResponse.json(
        //         { error: "Exam not found" },
        //         { status: 404 }
        //     );
        // }

        const userRole = session.user.role;
        if (userRole === "teacher") {
            if (attempt.exam.createdById !== session.user.id) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }
        } else if (userRole === "student") {
            if (attempt.studentId !== session.user.id) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }
        } else if (userRole === "admin") {
            // admin can view all results
        }else {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // calculate the total score for the attempt
        const percentage =
            attempt.exam.totalMarks > 0
                ? (attempt.score! /
                    attempt.exam.totalMarks) * 100
                : 0;

        // Students can see their score right away, but not which specific
        // questions they got right/wrong (or the explanations) until an
        // hour after the exam's end time. Otherwise a fast finisher could
        // submit early and tell classmates still taking it the answers.
        // Teachers/admins always see the full breakdown.
        const oneHourAfterEnd = attempt.exam.endsAt
            ? new Date(attempt.exam.endsAt.getTime() + 60 * 60 * 1000)
            : null;
        const answersRevealed =
            userRole !== "student" || !oneHourAfterEnd || new Date() >= oneHourAfterEnd;

        const answers = attempt.answers.map((answer) => {
            if (answersRevealed) {
                return answer;
            }

            return {
                ...answer,
                isCorrect: null,
                marksAwarded: null,
                question: {
                    ...answer.question,
                    explanation: null,
                    options: [], // options contain isCorrect, so hide them too
                },
            };
        });

        // ------------------------------------------------------------
        // Question-by-question review.
        // We go through EVERY question in the exam (not just the ones the
        // student answered), so unanswered questions show up too.
        // ------------------------------------------------------------
        const examQuestions = await prisma.examQuestion.findMany({
            where: { examId: attempt.examId },
            include: { question: { include: { options: true } } },
            orderBy: { order: "asc" },
        });

        const review = [];
        for (const examQuestion of examQuestions) {
            const question = examQuestion.question;

            // Find the student's answer to this question (may not exist).
            let answer = null;
            for (const a of attempt.answers) {
                if (a.questionId === question.id) {
                    answer = a;
                }
            }

            // What the student answered, as readable text.
            let yourAnswer = "";
            if (answer && answer.answerText) {
                yourAnswer = answer.answerText;
            }
            if (answer && answer.selectedOptionId) {
                for (const option of question.options) {
                    if (option.id === answer.selectedOptionId) {
                        yourAnswer = option.optionText;
                    }
                }
            }

            // The correct option(s), joined with commas.
            const correctOptions = [];
            for (const option of question.options) {
                if (option.isCorrect) {
                    correctOptions.push(option.optionText);
                }
            }

            review.push({
                questionId: question.id,
                questionText: question.questionText,
                marks: question.marks,
                answered: yourAnswer !== "",
                yourAnswer: yourAnswer,
                // Correctness, correct answer and explanation stay hidden
                // until answersRevealed (see above).
                correctAnswer: answersRevealed ? correctOptions.join(", ") : null,
                explanation: answersRevealed ? question.explanation : null,
                isCorrect: answersRevealed && answer ? answer.isCorrect : null,
                marksAwarded: answersRevealed && answer ? answer.marksAwarded : null,
            });
        }

        const result = {

            studentName:attempt.student.email,
            examTitle:attempt.exam.title,
            score:attempt.score,
            totalMarks:attempt.exam.totalMarks,
            percentage,
            pass:attempt.exam.passingMarks? attempt.score! >= attempt.exam.passingMarks: true,
            status:attempt.status,
            submittedAt:attempt.submittedAt,
            violations:attempt.violations,
            answers,
            review,
            answersRevealed,
            answersRevealAt: oneHourAfterEnd,
        };



        return NextResponse.json(
            {
                result
            },
            { status: 200 }
        );



    } catch (error) {
        console.error("Error fetching results:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

