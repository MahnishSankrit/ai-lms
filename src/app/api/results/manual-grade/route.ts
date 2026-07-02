// teacher can grade the exam as tjeir choice 
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }
        // req body
        const {attemptAnswerId,marksAwarded} = await req.json();

        const answer = await prisma.attemptAnswer.findUnique({
                where: {
                    id: attemptAnswerId
                }
            });

        if (!answer) {
            return NextResponse.json(
                { error: "Answer not found" },
                { status: 404 }
            );
        }

        const attempt =await prisma.examAttempt.findUnique({

                where: {
                    id: answer.attemptId
                },

                include: {
                    exam: true
                }

            });

        if (!attempt) {
            return NextResponse.json(
                { error: "Attempt not found" },
                { status: 404 }
            );
        }

        if (
            attempt.exam.createdById
            !== session.user.id
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        await prisma.attemptAnswer.update({

            where: {
                id: attemptAnswerId
            },

            data: {

                marksAwarded,

                isCorrect:
                    marksAwarded > 0

            }

        });

        const answers =
            await prisma.attemptAnswer.findMany({

                where: {
                    attemptId: attempt.id
                }

            });


        let totalScore = 0;

        for (const ans of answers) {

            totalScore +=
                ans.marksAwarded ?? 0;

        }


        await prisma.examAttempt.update({

            where: {
                id: attempt.id
            },

            data: {
                score: totalScore
            }

        });

        return NextResponse.json(
            { message: "Answer graded successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Grading Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
