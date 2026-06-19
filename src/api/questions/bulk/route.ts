// array in the request body, we can use the same schema but wrapped in an array
// this api teaches you bulk question creation, so the request body will be an array of questions, and we will create all the questions in one go, and return the created questions in the response, we will also return the errors for the questions that failed to create, if any

// in this not single question comes but an array or ypu can say the many questuon will comes , like teacher may upload many questions 
// simple approach is to loop through the array of questions and create each question one by one, but this is not efficient, so we will use the prisma createMany method to create all the questions in one go, but the createMany method does not return the created questions, it only returns the count of created questions, so we will have to fetch the created questions after creating them, but how do we know which questions were created successfully and which were not, for that we can use the transaction method of prisma, we can create a transaction for each question creation, and if any question creation fails, we can rollback the transaction for that question and return the error for that question in the response, and if all questions are created successfully, we can commit all the transactions and return the created questions in the response
// we will use the transaction method of prisma to create all the questions in one go, and if any question creation fails, we can rollback the transaction for that question and return the error for that question in the response, and if all questions are created successfully, we can commit all the transactions and return the created questions in the response


// step for this is;
// 1. validate the request body, it should be an array of questions, and each question should have the required fields
// 2. find the teacher who is creating the questions, we can get the teacher from the session, and then find the teacher in the database using the email from the session
// 3. create a transaction for each question creation, and if any question creation fails, we can rollback the transaction for that question and return the error for that question in the response, and if all questions are created successfully, we can commit all the transactions and return the created questions in the response


import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
// import { ZodError } from "zod";


export async function POST(req: Request){
    try {
        const session = await getServerSession(authOptions);
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
        const questions = createQuestionSchema.array().parse(validateBody); // validate the request body, it should be an array of questions


        // find the user like it is the one who is creating the question
       const teacherId = session.user.id;
      

        const teacher = await prisma.user.findUnique({
            where:{
                id: teacherId,
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

        await prisma.$transaction(async(tran) => {
            for(const ques of validateBody){
                await tran.question.create({
                    data: {
                        createdById: teacher.id,
                        questionText: ques.questionText,
                        explanation: ques.explanation,
                        imageUrl: ques.imageurl,
                        type:ques.type,
                        marks: ques.marks,
                        difficulty: ques.difficulty,
                        
                        options:{
                            create: ques.options.map((opt: { optionText: string; isCorrect: boolean }) => ({
                                optionText:opt.optionText,
                                isCorrect: opt.isCorrect,
                            }))
                        }
                    }
                })
            }
        })

        return NextResponse.json(
            {message: "Questions created successfully"},
             {status: 201}
        )

    } catch (error) {
        console.error("Error creating questions:", error);
        return NextResponse.json(
            {message : "An error occurred while creating questions"},
            {status: 500}
        )
    }
}



