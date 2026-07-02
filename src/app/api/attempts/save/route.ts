import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";




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
        const { attemptId, selectedOptionId, questionId } = body;

        // get the exam attempt and verify ownership
        const examAttempt = await prisma.examAttempt.findUnique({
            where: {
                id: attemptId,
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
                questionId: questionId,
                updatedAt: new Date(),
            },
            update:{
                selectedOptionId: selectedOptionId,
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


