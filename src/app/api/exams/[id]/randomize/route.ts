
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";



function shuffleArray<T>(array: T[]) {

    const shuffled =
        [...array];

    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}



/**
 * @swagger
 * /api/exams/{id}/randomize:
 *   post:
 *     tags: [Exams]
 *     summary: Teacher (owner) shuffles question order and each question's option order (draft-only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exam questions randomized successfully
 *       400:
 *         description: "Only exams in draft state can be randomized (error key is `message`, not `error`)"
 *       401:
 *         description: "Not authenticated (error key is `message`, not `error`)"
 *       403:
 *         description: "Not a teacher, or not the owner (error key is `message`, not `error`)"
 *       404:
 *         description: "Exam not found (error key is `message`, not `error`)"
 *       500:
 *         description: Server error
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { "message": "Not authenticated" },
                { status: 401 }
            )
        }


        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { "message": "Forbidden" },
                { status: 403 }
            )
        }

        const examId = (await params).id;
        const exam = await prisma.exam.findUnique({
            where: {
                id: examId,
            },
            include: {
                questions: {

                    include: {

                        question: {
                            include: {
                                options: true,
                            },
                        },
                    }
                }
            }
        })


        if (!exam) {
            return NextResponse.json(
                { "message": "Exam not found" },
                { status: 404 }
            )
        }


        if (exam.createdById !== session.user.id) {
            return NextResponse.json(
                { "message": "Forbidden" },
                { status: 403 }
            )
        }


        if (exam.status !== "draft") {
            return NextResponse.json(
                { "message": "Only exams in draft state can be randomized" },
                { status: 400 }
            )
        }

        // to huffle or randomize the question, as we know these are in the array we can use the sort function and pass a random comparator to it or we can use the Fisher-Yates algorithm to shuffle the array in place, which is more efficient and unbiased than using sort with a random comparator

        const shuffledQuestions = shuffleArray(exam.questions);

        // Now we need to update the exam with the new order of questions. We can do this by updating the sortOrder field of each question in the exam.questions array based on the new shuffled order.
        // transaction to update the sortOrder of each question in the shuffled order
        await prisma.$transaction(
            async (tx) => {

                // UPDATE QUESTION ORDER
                for (
                    let i = 0;
                    i < shuffledQuestions.length;
                    i++
                ) {

                    const examQuestion =
                        shuffledQuestions[i];

                    await tx.examQuestion.update({

                        where: {
                            id:
                                examQuestion.id,
                        },

                        data: {
                            order: i + 1,
                        },
                    });

                    // SHUFFLE OPTIONS
                    const shuffledOptions =
                        shuffleArray(
                            examQuestion.question.options
                        );

                    await tx.question.update({

                        where: {
                            id:
                                examQuestion.question.id,
                        },

                        data: {
                            options: {
                                deleteMany: {},
                                create: shuffledOptions.map((option) => ({
                                    optionText: option.optionText,
                                    isCorrect: option.isCorrect,
                                })),
                            },
                        },
                    });
                }
            }   
        )


        return NextResponse.json(
            { message: "Exam questions randomized successfully" },
            { status: 200 }
        );



    } catch (error) {
        console.error("Error in randomizing exam questions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
         );
    }
}



