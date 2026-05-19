

// teacher can see the list of the students in the classroom and also the details of the students in the classroom

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod";



export async function GET(req: Request, { params }: { params: { id: string } }) {
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

        const classroom = await prisma.classroom.findFirst({
            
            where: {
                id: classroomId,
                ownerId: session.user.id,
            },
            
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        
        if (!classroom) {
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            )
        }
        
        if (classroom.ownerId !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { members: classroom.members },
            { status: 200 }
        )

    } catch (error) {
        console.error("Error in fetching classroom members:", error);
        return NextResponse.json(
            { error: "Failed to fetch classroom members" },
            { status: 500 }
        )
    }
}


