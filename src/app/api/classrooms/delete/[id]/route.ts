


import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


/**
 * @swagger
 * /api/classrooms/delete/{id}:
 *   delete:
 *     tags: [Classrooms]
 *     summary: Teacher (owner) deletes a classroom
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Classroom deleted successfully
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       404:
 *         description: Classroom not found or not owned by you
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const classroomId = (await params).id;

        const classroom = await prisma.classroom.findFirst({
            where: {
                id: classroomId,
                ownerId: session.user.id,
            }
        });

        if (!classroom) {
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            )
        }

        await prisma.classroom.delete({
            where: {
                id: classroomId,
            }
        });

        return NextResponse.json(
            { message: "Classroom deleted successfully", classroomId },
            { status: 200 }
        )
    } catch (error) {
        console.error("Error in deleting classroom:", error);
        return NextResponse.json(
            { error: "Failed to delete classroom" },
            { status: 500 }
        )
    }
}



