
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod";


const announcementSchema = z.object({
    title: z.string(),
    content: z.string(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

        const classroomId = params.id;
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
