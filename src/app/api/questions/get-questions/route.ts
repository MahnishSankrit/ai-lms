import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// import { createQuestionSchema } from "@/validation/question.schema";


/**
 * @swagger
 * /api/questions/get-questions:
 *   get:
 *     tags: [Questions]
 *     summary: Paginated list of the logged-in teacher's own questions
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated questions list
 *       400:
 *         description: Session missing email
 *       403:
 *         description: Not a teacher (also triggers when not logged in)
 *       404:
 *         description: Teacher not found, or no questions exist for this page
 *       500:
 *         description: Server error
 */
export async function GET(req: Request){
    try {
        //authentication
        const session  = await getServerSession(authOptions);
        // authorization
        if(session?.user.role !== "teacher"){
            return NextResponse.json(
                {error: "Forbidden"},
                {status: 403}
            )
        }

        //finding the teacher who is creating the question
        const teacherEmail = session.user.email
        if(!teacherEmail){
            return NextResponse.json(
                {error: "User email missing from session"},
                {status: 400}
            )
        }
        // finding the teacher in the database
        const teacher = await prisma.user.findUnique({
            where: {
                email: teacherEmail,
            },
           
        })

        if(!teacher){
            return NextResponse.json(
                {error: "User not found"},
                {status: 404}
            )
        }

        //geting the questions created by the teacher

        // const questions = await prisma.question.findMany({
        //     where: {
        //         createdById: teacher.id,
        //     },
        //     include:{
        //         options: true,
        //     },
        //     orderBy:{
        //         createdAt: "desc"
        //     }
        // })

        // need to dpo the pagination i cannot use the findmany as it will return all the qiuestion which i dont want 
        // step 1 =  get the page and the limit 
        const { searchParams } = new URL(req.url);
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 10;

        // step 2 = calcu;ate the skip 
        const skip = (page -1) * limit;
        

        const questions = await prisma.question.findMany({
            where:{
                createdById:teacher.id,
            },
            include:{
                options: true,
            },
            orderBy: {
                createdAt: "desc"
            },
            skip: skip,
            take: limit,
        })

        // step 4 calculate the total count of the quaetion as the frontend will need this 
        const totalCount  = await prisma.question.count({
            where: {
                createdById: teacher.id,
            }
        })

        const totalPages = Math.ceil(totalCount / limit);   

        if(questions.length === 0){
            return NextResponse.json(
                {error: "No questions found"},
                {status: 404}
            )
        }

        return NextResponse.json(
            {
                questions: questions,
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: page
            },
            {status: 200}
        )

    } catch (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}


