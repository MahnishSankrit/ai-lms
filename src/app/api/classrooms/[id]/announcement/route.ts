
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod";


const announcementSchema = z.object({
    title: z.string(),
    content: z.string(),
})

/**
 * @swagger
 * /api/classrooms/{id}/announcement:
 *   post:
 *     tags: [Classrooms]
 *     summary: Teacher (owner) posts an announcement (notifies all members)
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
 *             required: [title, content]
 *             properties:
 *               title: { type: string, example: "Midterm Schedule Released" }
 *               content: { type: string, example: "The midterm exam will be held on 2026-08-01." }
 *     responses:
 *       201:
 *         description: Announcement created
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       404:
 *         description: Classroom not found or not owned by you
 *       500:
 *         description: Validation error or server error
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

        const teacherId = session.user.id;
        if (!teacherId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const classroomId = (await params).id;
        const classroom = await prisma.classroom.findFirst({
            where: {
                id: classroomId,
                ownerId: teacherId,
            }
        });

        if (!classroom) {
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            )
        }

        const body = await req.json();
        const validatedBody = announcementSchema.parse(body);

        const announcement = await prisma.announcement.create({
            data: {
                title: validatedBody.title,
                content: validatedBody.content,
                classroomId,
                teacherId,
            }
        })

        // creating the announcement in the database

        const members = await prisma.classroomMember.findMany({
            where: {
                classroomId,
            },
        });

        await prisma.notification.createMany({
            data: members.map(member => ({
                userId: member.userId,
                title:"New Announcement",
                message:validatedBody.title,
            })),
        });

        return NextResponse.json(
            { message: "Announcement created successfully", announcement },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error in creating announcement:", error);
        return NextResponse.json(
            { error: "Failed to create announcement" },
            { status: 500 }
        )
    }
}
