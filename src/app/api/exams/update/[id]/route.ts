
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createExamSchema } from "@/validation/exam.schema";



/**
 * @swagger
 * /api/exams/update/{id}:
 *   patch:
 *     tags: [Exams]
 *     summary: Teacher updates exam fields (partial update)
 *     description: "Ownership quirk: request is only blocked when the caller is NOT the owner AND the exam status is not draft -- a non-owner can update a draft exam."
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: "Partial createExamSchema. Only title, description, status, durationMinutes, classroomId are actually persisted."
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [draft, published, ongoing, completed] }
 *               durationMinutes: { type: number }
 *               classroomId: { type: string }
 *     responses:
 *       200:
 *         description: Exam updated successfully
 *       400:
 *         description: Empty body (no fields to update)
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Validation error or server error
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const examId = (await params).id;
        const exam = await prisma.exam.findUnique({
            where: {
                id: examId,
            }
        })

        if(!exam){
            return NextResponse.json(
                {error: "Exam not found"},
                {status: 404}
            )
        }

        const body = await req.json();
        const validatedBody = createExamSchema.partial().parse(body);

        if (Object.keys(validatedBody).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            )
        }


        if(exam.createdById !== session.user.id && exam.status !== "draft"){
            return NextResponse.json(
                {error: "Forbidden"},
                {status: 403}
            )
        }

        // after verifying the exam belongs to the teacher who is updating and the exam is in draft state, we can allow the teacher to update the exam
        const updatedExam = await prisma.exam.update({
            where: {
                id: examId,
            },
            data: {
                title: validatedBody.title,
                description: validatedBody.description,
                status: validatedBody.status,
                durationMinutes: validatedBody.durationMinutes,
                classroomId: validatedBody.classroomId,
                startsAt: validatedBody.startsAt ? new Date(validatedBody.startsAt) : undefined,
                endsAt: validatedBody.endsAt ? new Date(validatedBody.endsAt) : undefined,
            }
        })


        return NextResponse.json(
            {"message": "Exam updated successfully", "exam": updatedExam},
            {status: 200}
        )
       

    } catch (error) {
        console.error("Error in updating exam:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}



