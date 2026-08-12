import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/exams/{id}/regenerate-code:
 *   post:
 *     tags: [Exams]
 *     summary: Teacher (owner) generates a new access code for an exam, invalidating the old one
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: New access code generated
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the exam's creator
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Server error
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const examId = (await params).id;
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
        });

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            )
        }

        if (exam.createdById !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const accessCode = Math.random().toString(36).substring(2, 8);

        const updatedExam = await prisma.exam.update({
            where: { id: examId },
            data: { accessCode },
        });

        return NextResponse.json(
            { message: "New access code generated", accessCode: updatedExam.accessCode },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error regenerating exam access code:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
