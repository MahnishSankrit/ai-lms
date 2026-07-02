import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";


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



