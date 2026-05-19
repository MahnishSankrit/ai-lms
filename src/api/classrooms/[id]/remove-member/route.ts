
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";

const memberRemovalSchema = z.object({
    userId: z.string(),
})


export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

        const classroomId = params.id;
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

        const body = await req.json();
        const validatedBody = memberRemovalSchema.parse(body);

        const  studentId  = validatedBody.userId


        const memberShip = await prisma.classroomMember.findFirst({
            where: {
                classroomId,
                id: studentId,
            }
        })

        if (!memberShip) {
            return NextResponse.json(
                { error: "Member not found in the classroom" },
                { status: 404 }
            )
        }


        await prisma.classroom.delete({
            where: {
                id: memberShip.id,
            }
        })


    return NextResponse.json(
        { message: "Member removed successfully", classroomId },
        { status: 200 }
    )


} catch (error) {
    console.error("Error in removing member from classroom:", error);
    return NextResponse.json(
        { error: "Failed to remove member from classroom" },
        { status: 500 }
    )
}
}


