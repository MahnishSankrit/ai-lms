
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { completeExpiredExams } from "@/lib/exam-status";
import * as z from "zod";




/**
 * @swagger
 * /api/classrooms/details/{id}:
 *   get:
 *     tags: [Classrooms]
 *     summary: Get classroom details (owning teacher or member student)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Classroom details, including memberCount and teacher
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Teacher who isn't the owner, or student who isn't a member
 *       404:
 *         description: Classroom not found, or classroom has no subject set
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        // close exams whose end time has passed, so the status shown is current
        await completeExpiredExams();
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

        // Latest announcements, newest first.
        const announcements = await prisma.announcement.findMany({
            where: { classroomId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        // Exams students can see: published (open/upcoming) and completed (past).
        // Drafts are hidden from students.
        const exams = await prisma.exam.findMany({
            where: {
                classroomId,
                status: { in: ["published", "ongoing", "completed"] },
            },
            orderBy: { startsAt: "asc" },
            select: {
                id: true,
                title: true,
                status: true,
                durationMinutes: true,
                totalMarks: true,
                startsAt: true,
                endsAt: true,
            },
        });

        // For students: their own latest attempt on each exam, so the page
        // can show "Completed" or a link to the result.
        const myAttempts = await prisma.examAttempt.findMany({
            where: {
                studentId: session.user.id,
                examId: { in: exams.map((exam) => exam.id) },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, examId: true, status: true, score: true },
        });

        // Show the teacher's display name if they've set one, otherwise their email.
        const teacherProfile = await prisma.userProfile.findUnique({
            where: { userId: classroom.ownerId },
        });
        let teacherName = classroom.owner.email;
        if (teacherProfile && teacherProfile.displayName) {
            teacherName = teacherProfile.displayName;
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
                    teacherName: teacherName,
                    announcements: announcements,
                    exams: exams,
                    myAttempts: myAttempts,
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





