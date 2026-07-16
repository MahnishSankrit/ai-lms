import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";


/**
 * @swagger
 * /api/questions/{id}/details:
 *   get:
 *     tags: [Questions]
 *     summary: Fetch a single question (with options)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Question with options
 *       401:
 *         description: Not logged in
 *       403:
 *         description: "Not a teacher, or not this question's creator (returned as { message } for the ownership case)"
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        if(session.user.role !== "teacher"){
            return NextResponse.json(
                {error: "Forbidden"},
                {status: 403}
            )
        }

        const teacherId = session.user.id;
        const questionId = (await params).id;

        // findinf the question in the db so that i can see the details of the questions 
        const question = await prisma.question.findUnique({
            where:{
                id: questionId,
            },
            include:{
                options: true,
            }
        })

        if(!question){
            return NextResponse.json(
                {error: "Question not found"},
                {status: 404}
            )
        }

        // checking if the questuon is created by the teavcher who is trying to access the questuon
        if(question.createdById !== teacherId){
            return NextResponse.json(
                {message: "you cannot access this question because you are not the creator of this question"},
                {status: 403}
            )
        }
        

        // finallyy return ing the question details 
        return NextResponse.json(
            {question},
            {status: 200}
        )




    } catch (error) {
        console.error("Error fetching question details:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}

