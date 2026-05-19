import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";





// condtinal checking for the user to fetch the classrooms like for teacher and like for the students

export async function GET(req: Request){
    try {
        const session = await getServerSession(authOptions);
        if(!session){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }

        if(session.user.role === "teacher"){
            const classrooms = await prisma.classroom.findMany({
                where: {
                    ownerId: session.user.id,
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            email: true, 
                        }
                    },
                },
                orderBy: { 
                    createdAt: "desc",
                    }
            });
            return NextResponse.json(
                {classrooms},
                {status: 200}
            )
        }
        else if(session.user.role === "student"){
            const classrooms = await prisma.classroom.findMany({
                where: {
                    members: {
                        some: {
                            id: session.user.id,
                        }
                    }
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            email: true, 
                        }
                    },
                },
                orderBy: {
                    createdAt: "desc",
                }
            });
            return NextResponse.json(
                {classrooms},
                {status: 200}
            );
        }   

        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        )

    } catch (error) {
        console.error("Error in fetching classrooms:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
} 


