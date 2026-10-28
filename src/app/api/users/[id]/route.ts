import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Fetch a basic public profile by user id
 *     description: "No authentication check in this route -- effectively a public endpoint."
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Basic user profile (id, email, role, status, createdAt)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Users]
 *     summary: Admin deletes a user account
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Attempting to delete your own admin account
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not an admin
 *       404:
 *         description: Target user not found
 *       500:
 *         description: "FK constraint error if the user has dependent rows without cascade rules, or other server error"
 */
export async function GET(req: Request,{ params }: { params: Promise<{ id: string }> }) {
    try {
        // Was open to anyone, even logged out -- anyone could look up any
        // user's email/role/status by id. Admin only now.
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        if (session.user.role !== "admin") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: {
                id: id,
            },

            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
        })
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            { user },
            { status: 200 }
        )
    } catch (error) {
        console.error("Error in fetching user details:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession(authOptions);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        if(user.user.role !== "admin"){
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const existingUser = await prisma.user.findUnique({
            where: {
                id: id,
            },
        });
        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }
        if(user.user.id === id){
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            );
        }

        // Attempts, classrooms, exams, questions, uploads and announcements
        // point at the user without a cascade, so Postgres refuses to delete
        // a user who has any of them (that used to come back as a 500).
        // Deleting them would also wipe grading history. So: a user with
        // history is deactivated instead; a user with none is really deleted.
        const [attempts, classrooms, exams, questions, uploads, announcements] = await Promise.all([
            prisma.examAttempt.count({ where: { studentId: id } }),
            prisma.classroom.count({ where: { ownerId: id } }),
            prisma.exam.count({ where: { createdById: id } }),
            prisma.question.count({ where: { createdById: id } }),
            prisma.upload.count({ where: { uploadedById: id } }),
            prisma.announcement.count({ where: { teacherId: id } }),
        ]);
        const hasHistory = attempts + classrooms + exams + questions + uploads + announcements > 0;

        if (hasHistory) {
            await prisma.user.update({
                where: { id: id },
                data: { status: "inactive" },
            });

            return NextResponse.json(
                {
                    message: "User has exam or classroom history, so they were deactivated instead of deleted. They can no longer log in.",
                    deactivated: true,
                },
                { status: 200 }
            );
        }

        await prisma.user.delete({
            where: {
                id: id,
            },
        });

        return NextResponse.json(
            { message: "User deleted successfully", deactivated: false },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error in deleting user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
