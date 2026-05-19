
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createExamSchema } from "@/validation/exam.schema";






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

        // create the exam in the database
        const exam = await prisma.exam.create({
            data: {

                classroomId: validateBody.classroomId,
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
                startsAt: validatedBody.startsAt,
                endsAt: validatedBody.endsAt,
            },
        })

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




