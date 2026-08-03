import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
/**
 * @swagger
 * /api/classrooms/join:
 *   post:
 *     tags: [Classrooms]
 *     summary: Student joins a classroom
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [joinCode]
 *             properties:
 *               joinCode: { type: string, example: sq7tso }
 *     responses:
 *       200:
 *         description: Joined classroom successfully
 *       400:
 *         description: Missing join code, or already a member
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a student
 *       404:
 *         description: Classroom not found
 *       500:
 *         description: Server error
 */
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
        if(!session.user.id){
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        // Students only ever see the short joinCode (e.g. "sq7tso"), never the
        // classroom's real database id, so that's what we look up by here.
        const joinCode = typeof body === "string" ? body : body.joinCode || body.classroomId || body.id;
        if (!joinCode) {
            return NextResponse.json(
                { error: "Join code is required" },
                { status: 400 }
            );
        }

        const classroom = await prisma.classroom.findUnique({
            where: {
                joinCode,
            },
        });
        if(!classroom){
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            );
        }

        // check if the user is already a member of the classroom
        const isMember = await prisma.classroomMember.findFirst({
            where: {
                classroomId: classroom.id,
                userId: session.user.id,
            }
        });

        if (isMember) {
            return NextResponse.json(
                { error: "Already a member" },
                { status: 400 }
            );
        }

        await prisma.classroomMember.create({
            data: {
                classroomId: classroom.id,
                userId: session.user.id,
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





