import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/violations/{attemptId}:
 *   get:
 *     tags: [Violations]
 *     summary: Fetch the violation log for one attempt
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of violations for this attempt
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Student who isn't the attempt owner, or teacher who doesn't own the exam
 *       404:
 *         description: Attempt not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const attemptId = (await params).attemptId;

        const attempt = await prisma.examAttempt.findUnique({
            where: { id: attemptId },
            include: { exam: true },
        });

        if (!attempt) {
            return NextResponse.json(
                { error: "Attempt not found" },
                { status: 404 }
            );
        }

        if (session.user.role === "student" && attempt.studentId !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        if (session.user.role === "teacher" && attempt.exam.createdById !== session.user.id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const violations = await prisma.violation.findMany({
            where: { attemptId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(
            { violations },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching violations:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
