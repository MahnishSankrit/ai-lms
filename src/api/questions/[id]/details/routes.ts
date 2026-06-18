import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";


export async function GET(req: Request, { params }: { params: { id: string } }) {
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
        const questionId = params.id;

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

