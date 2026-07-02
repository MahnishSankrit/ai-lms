
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod";




export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const classroomId = (await params).id;
        // here we will fetch the classroom details from the database using the classroomId and also check if the user is a member of the classroom or not
        // this is relational fetching using prisma and we will also include the owner details in the response

        const classroom = await prisma.classroom.findUnique({
            where: {
                id: classroomId,

            },
            include:{
                owner: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
                members: {
                    include:{
                        user:{
                            select: {
                                id: true,
                                email: true,
                            }
                        }
                    }
                }
            }
        })

        if(!classroom){
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            )
        }

        // preventint the teacher from accessing the classroom details if he is not the owner of the classroom and also prevent the students from accessing the classroom details if they are not a member of the classroom
        if(session.user.role === "teacher" && classroom.ownerId !== session.user.id){
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        // student can only access the classroom details if they are a member of the classroom
        const isMember = classroom.members.some(member => member.userId === session.user.id);
        if(session.user.role === "student" && !isMember){
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }


        const memberCount = classroom.members.length;
        const subject = classroom.subject;
        if(!subject){
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                classroom: {
                    id: classroom.id,
                    name: classroom.name,
                    subject: classroom.subject,
                    description: classroom.description,
                    joinCode: classroom.joinCode,
                    memberCount: memberCount,
                    teacher: classroom.owner,
                }
             },
             {
                status: 200,
                }
        )


    } catch (error) {
        console.error("Error in fetching classroom details:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}





