import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";



export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        if(session.user.role !== "student"){
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const classroomid = await req.json();
        const classroom = await prisma.classroom.findUnique({
            where: {
                id: classroomid,
            },
        });
        if(!classroom){
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            );
        }

        // check if the user is already a member of the classroom
        const isMember = await prisma.classroom.findFirst({
            where: {
                id: classroomid,
                students: {
                    some: {
                        id: session.user.id
                    }
                }
            }
        });

        if (isMember) {
            return NextResponse.json(
                { error: "Already a member" },
                { status: 400 }
            );
        }

        const createMember = await prisma.classroom.update({
            where: {
                id: classroomid,
            },
            data: {
                members: {
                    connect: {
                        id: session.user.id,
                    }
                }
            }
        });

        return NextResponse.json(
            { message: "Joined classroom successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error joining classroom:", error);   
        return NextResponse.json(
            { error: "Failed to join classroom" },
            { status: 500 }
        );  
    }
}





