
// this will teach me the deleteting the relation rows

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";

const leaveClassroomSchema = z.object({
    classroomId: z.string(),
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if(!session){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }

        if(session.user.role !== "student"){
            return NextResponse.json(
                {error: "Forbidden"},
                {status: 403}
            )
        }

        const body = await req.json();
        const validateBody  = leaveClassroomSchema.parse(body)
        const classroomId = validateBody.classroomId;


        const isMember = await prisma.classroomMember.findFirst({
            where: {
                classroomId,
                id: session.user.id,
            }
        })

        if(!isMember){
            return NextResponse.json(
                {error: "Not a member of the classroom"},
                {status: 400}
            )
        }

        await prisma.classroomMember.delete({
            where: {
                id: isMember.id
            }
        })

        return NextResponse.json(
            {message: "Left the classroom successfully"},
            {status: 200}
        )

    } catch (error) {
        console.error("Error in leaving classroom:", error);
        return NextResponse.json(
            { error: "Failed to leave classroom" },
            { status: 500 }
        )   
    }
}


