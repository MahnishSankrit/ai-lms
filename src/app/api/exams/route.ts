
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createExamSchema } from "@/validation/exam.schema";






/**
 * @swagger
 * /api/exams:
 *   post:
 *     tags: [Exams]
 *     summary: Teacher creates a new exam (starts as draft)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classroomId, title, durationMinutes, totalMarks, shuffleQuestions, shuffleOptions, fullscreenRequired]
 *             properties:
 *               classroomId: { type: string }
 *               title: { type: string, minLength: 3, maxLength: 100, example: "Mid Semester Exam" }
 *               description: { type: string, example: "Covers chapters 1 to 5" }
 *               instructions: { type: string, example: "No calculators allowed." }
 *               durationMinutes: { type: number, minimum: 1, example: 60 }
 *               totalMarks: { type: number, minimum: 1, example: 50 }
 *               passingMarks: { type: number, example: 20 }
 *               negativeMarking: { type: number, example: 0.25 }
 *               shuffleQuestions: { type: boolean, example: true }
 *               shuffleOptions: { type: boolean, example: true }
 *               fullscreenRequired: { type: boolean, example: true }
 *               startsAt: { type: string, format: date-time, example: "2026-08-01T09:00:00.000Z" }
 *               endsAt: { type: string, format: date-time, example: "2026-08-01T10:00:00.000Z" }
 *     responses:
 *       201:
 *         description: Exam created (status = draft)
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       404:
 *         description: Teacher not found, or classroom not found/not owned by you
 *       500:
 *         description: Validation error or server error
 */
export async function POST(req: Request) {
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


        const validateBody = await req.json();
        const validatedBody = createExamSchema.parse(validateBody);

        // find the user like it is the one who is creating the exam

        const teacherEmail = session.user.email;
        if (!teacherEmail) {
            return NextResponse.json(
                { error: "User email missing from session" },
                { status: 400 }
            )
        }
        const user = await prisma.user.findUnique({
            where: {
                email: teacherEmail,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        // verift the classroom belongs to the teacher who is creating the exam
        const classroom = await prisma.classroom.findFirst({
            where: {
                id: validateBody.classroomId,
                ownerId: user.id,
            }
        })

        if (!classroom) {
            return NextResponse.json(
                { error: "Classroom not found or you don't have permission to create exam for this classroom" },
                { status: 404 }
            )
        }

        const questionIds = validatedBody.questionIds;
        if (questionIds.length > 0) {
            const ownedQuestions = await prisma.question.findMany({
                where: {
                    id: { in: questionIds },
                    createdById: user.id,
                },
                select: { id: true },
            });

            if (ownedQuestions.length !== questionIds.length) {
                return NextResponse.json(
                    { error: "One or more selected questions were not found or are not yours" },
                    { status: 400 }
                );
            }
        }

        // Same style of code as a classroom's joinCode: short, random,
        // shared with students separately from the exam link itself.
        const accessCode = Math.random().toString(36).substring(2, 8);

        // create the exam in the database
        const exam = await prisma.$transaction((tx) =>
            tx.exam.create({
                data: {
                    classroomId: validatedBody.classroomId,
                    createdById: user.id,
                    title: validatedBody.title,
                    description: validatedBody.description,
                    instructions: validatedBody.instructions,
                    durationMinutes: validatedBody.durationMinutes,
                    totalMarks: validatedBody.totalMarks,
                    passingMarks: validatedBody.passingMarks,
                    negativeMarking: validatedBody.negativeMarking,
                    shuffleQuestions: validatedBody.shuffleQuestions,
                    shuffleOptions: validatedBody.shuffleOptions,
                    fullscreenRequired: validatedBody.fullscreenRequired,
                    accessCode,
                    startsAt: validatedBody.startsAt,
                    endsAt: validatedBody.endsAt,
                    questions: {
                        create: questionIds.map((questionId, index) => ({
                            questionId,
                            order: index + 1,
                        })),
                    },
                },
            })
        );

        return NextResponse.json(
            { message: "Exam created successfully", exam },
            { status: 201 }
        )



    } catch (error) {
        console.error("Error in creating exam:", error);
        return NextResponse.json(
            { error: "Failed to create exam" },
            { status: 500 }
        )
    }
}




