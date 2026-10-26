import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";


/**
 * @swagger
 * /api/questions:
 *   post:
 *     tags: [Questions]
 *     summary: Teacher creates a question (with options) in their question bank
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionText, type, marks, options]
 *             properties:
 *               questionText: { type: string, minLength: 5, example: "What is the capital of France?" }
 *               type: { type: string, enum: [mcq, true_false, short_answer, multiple_select] }
 *               marks: { type: number, minimum: 1, example: 2 }
 *               difficulty: { type: string, example: Easy }
 *               explanation: { type: string, example: "Paris has been the capital since 987 AD." }
 *               imageUrl: { type: string }
 *               options:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required: [optionText, isCorrect]
 *                   properties:
 *                     optionText: { type: string, example: Paris }
 *                     isCorrect: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Question created successfully
 *       400:
 *         description: Zod validation error (returned as { error, details })
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher; account suspended; or account not verified
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Server error
 */
export async function POST(req: Request){
    try {
        const session  = await getServerSession(authOptions);
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

        const validateBody = await req.json();
        const validatedBody = createQuestionSchema.parse(validateBody); 

        // find the user like it is the one who is creating the question
        const teacherEmail = session.user.email
        if(!teacherEmail){
            return NextResponse.json(
                {error: "User email missing from session"},
                {status: 400}
            )
        }

        const teacher = await prisma.user.findUnique({
            where: {
                email: teacherEmail,
            }
        })

        if(!teacher){
            return NextResponse.json(
                {error: "User not found"},
                {status: 404}
            )
        }

        if(teacher.status === "suspended"){
            return NextResponse.json(
                {error: "Your account is suspended, you cannot create questions"},
                {status: 403}
            )
        }

        if(teacher.isVerified === false){
            return NextResponse.json(
                {error: "Your account is not verified, you cannot create questions"},
                {status: 403}
            )
        }

        // creating the questions 
        const question = await prisma.question.create({
            data : {
                questionText : validatedBody.questionText,
                explanation: validatedBody.explanation,
                imageUrl: validatedBody.imageUrl,
                type : validatedBody.type,
                marks : validatedBody.marks,
                difficulty : validatedBody.difficulty,
                bankName : validatedBody.bankName || null,
                createdById : teacher.id,
                options : {
                    create : validatedBody.options,
                },
            },
            include: {
                options: true,
            }
        })

        return NextResponse.json(
            {message: "Question created successfully", question},
            {status: 201}
        )

    } catch (error) {
        console.error("Error creating question:", error);
        if(error instanceof ZodError){
            return NextResponse.json(
                {error: "Invalid request body", details: error.issues}, 
                {status: 400}
            )
        }   

        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}




