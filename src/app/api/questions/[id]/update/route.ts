import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const teacherId = session.user.id;
        const questionId = (await params).id;
        const validateBody = await req.json();
        const validatedBody = createQuestionSchema.parse(validateBody);

        const question = await prisma.question.findUnique({
            where: {
                id: questionId,
            }
        })
        if (!question) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            )
        }

        if (question.createdById !== teacherId) {
            return NextResponse.json(
                { error: "Forbidden, you are not the creator of this question" },
                { status: 403 }
            )
        }

        // find the user who is authorized to update ;
        // const teacherEmail = session.user.email;
        // if(!teacherEmail){
        //     return NextResponse.json(
        //         {error: "User email missing from session"},
        //         {status: 400}
        //     )
        // }

        // const teacher = await prisma.user.findUnique({
        //     where:{
        //         email: teacherEmail,
        //     },
        //     include:{
        //         options: true,
        //     }
        // })

        // deleting the old options 
        // using the transaction to delete the old options and create the new options in a single transaction
        const newOptionData = validatedBody.options.map((option) =>
        ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            questionId: questionId,
            
        })
        )
        
        await prisma.$transaction(async (tx) => {

            await tx.questionOption.deleteMany({
                where: {
                    questionId,
                },
            });

            await tx.question.update({
                where: {
                    id: questionId,
                },
                data: {
                    questionText: validatedBody.questionText,
                    explanation: validatedBody.explanation,
                    imageUrl: validatedBody.imageUrl,
                },
            });

            await tx.questionOption.createMany({
                data: newOptionData,
            });

        });

        


       

        return NextResponse.json(
            { message: "Question updated successfully" ,
                question: newOptionData
            },
            { status: 200 }
        )


    } catch (error) {
        console.error("Error updating question:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}


