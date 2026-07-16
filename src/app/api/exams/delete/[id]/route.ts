
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



/**
 * @swagger
 * /api/exams/delete/{id}:
 *   delete:
 *     tags: [Exams]
 *     summary: Teacher (owner) deletes an exam
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exam deleted successfully
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the exam's creator
 *       404:
 *         description: Exam not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
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
            where: {
                id: examId,
            }
        })

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

        await prisma.exam.delete({
            where: {
                id: examId,
            }
        })

        return NextResponse.json(
            { message: "Exam deleted successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error deleting exam:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}





