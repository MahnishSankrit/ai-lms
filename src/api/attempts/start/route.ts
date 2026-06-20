
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// import { createQuestionSchema } from "@/validation/question.schema";
// import { ZodError } from "zod";



export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }
        if (session.user.role !== "student") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const body = await req.json();
        const { examId } = body;

        const exam = await prisma.exam.findUnique({
            where: {
                id: examId
            }
        })

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            )
        }

        if (exam.status !== "published") {
            return NextResponse.json(
                { error: "Exam is not published yet" },
                { status: 403 }
            )
        }

        // starting the task
        if (exam.startsAt && new Date() < new Date(exam.startsAt)) {
            return NextResponse.json(
                { error: "Exam has not started yet" },
                { status: 403 }
            )
        }

        // endfing trhe task
        if (exam.endsAt && new Date() > new Date(exam.endsAt)) {
            return NextResponse.json(
                { error: "Exam has already ended" },
                { status: 403 }
            )
        }

        // check that the student belong to the same class or not means check it is the member of the class or not 
        const student = await prisma.user.findUnique({
            where: {
                id: session.user.id
            }
        })

        if (!student) {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            )
        }

        if (student.status !== "active") {
            return NextResponse.json(
                { error: "Student is not active" },
                { status: 403 }
            )
        }
        const classRoom = await prisma.classroom.findUnique({
            where: {
                id: exam.classroomId
            }
        })

        if (!classRoom) {
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            )
        }

        // membership 
        const membership = await prisma.classroomMember.findFirst({
            where: {
                classroomId: classRoom.id,
                userId: student.id
            }
        })

        // this means that the student is not enrolled 
        if (!membership) {
            return NextResponse.json(
                { error: "You are not enrolled in this classroom" },
                { status: 403 }
            )
        }

        // handle the already attempted case
        const existingAttempt = await prisma.examAttempt.findFirst({
            where: {
                examId: exam.id,
                studentId: student.id
            }
        })

        if (existingAttempt) {
            return NextResponse.json(
                { error: "You have already attempted this exam" },
                { status: 403 }
            )
        }



        // create a new attempt for the student
        const newAttempt = await prisma.examAttempt.create({
            data: {
                examId: exam.id,
                studentId: student.id,
                status: "in_progress",
            },
        });
        return NextResponse.json(
            { message: "Exam attempt started", attemptId: newAttempt.id },
            { status: 200 }
        )


    } catch (error) {
        console.error("Error starting exam attempt:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )

    }
}

