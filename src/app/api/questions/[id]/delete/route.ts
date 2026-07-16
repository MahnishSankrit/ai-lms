import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";


/**
 * @swagger
 * /api/questions/{id}/delete:
 *   delete:
 *     tags: [Questions]
 *     summary: Teacher (owner) deletes a question
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the question's creator
 *       404:
 *         description: Question not found
 *       500:
 *         description: "Deleting a question referenced by an ExamQuestion/AttemptAnswer may fail (no cascade), or other server error"
 */
export async function DELETE(req: Request, {params} : {params: Promise<{ id: string }>}){
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

        const question = await prisma.question.findUnique({
            where :{
                id : (await params).id,
            }
        })

        if(!question){
            return NextResponse.json(
                {error: "Question not found"},
                {status: 404}
            )
        }

        if(question.createdById !== session.user.id){
            return NextResponse.json(
                {error: "Forbidden, you are not the creator of this question"},
                {status: 403}
            )
        }

        // deleting the question from the db

        await prisma.question.delete({
            where: {
                id: (await params).id,
            }
        })


        return NextResponse.json(
            {message: "Question deleted successfully"},
            {status: 200}
        )


    } catch (error) {
        console.error("Error deleting question:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}



