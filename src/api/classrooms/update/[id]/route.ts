import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";

const updateClassroomSchema = z.object({
    name: z.string().min(3).max(100).optional(),
    subject: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
            );
        }

        const classroomId = params.id;
        // only the respective owner of the classroom can update the classroom details
        const classroom = await prisma.classroom.findFirst({
            where: {
                id: classroomId,
                ownerId: session.user.id,
            },
        });
        if (!classroom) {
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            )
        }

        const body = await req.json();
        const validatedBody = updateClassroomSchema.parse(body);

        const updateClassroom = await prisma.classroom.update({
            where: {
                id: classroomId,
            },
            data: validatedBody
        });

        return NextResponse.json(
            { message: "Classroom updated successfully", classroom: updateClassroom },
            { status: 200 }
        )

    } catch (error) {
        console.error("Error updating classroom:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}

