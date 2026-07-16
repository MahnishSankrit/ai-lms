import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * @swagger
 * /api/results/leaderboard:
 *   get:
 *     tags: [Results]
 *     summary: Ranked leaderboard of all submitted attempts for one exam
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: examId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leaderboard with rank, studentName, score, submittedAt
 *       400:
 *         description: Missing examId
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Unsupported role; teacher doesn't own the exam; or student not enrolled
 *       404:
 *         description: Exam not found, or no submitted attempts yet
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
    try {

        // ==========================================
        // STEP 1 : AUTHENTICATION
        // ==========================================

        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ==========================================
        // STEP 2 : ROLE CHECK
        // ==========================================

        if (
            session.user.role !== "student" &&
            session.user.role !== "teacher" &&
            session.user.role !== "admin"
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // ==========================================
        // STEP 3 : GET EXAM ID
        // ==========================================

        const { searchParams } = new URL(req.url);

        const examId = searchParams.get("examId");

        if (!examId) {
            return NextResponse.json(
                { error: "Exam ID is required" },
                { status: 400 }
            );
        }

        // ==========================================
        // STEP 4 : FIND EXAM
        // ==========================================

        const exam = await prisma.exam.findUnique({
            where: {
                id: examId,
            },
        });

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            );
        }

        // ==========================================
        // STEP 5 : PERMISSION CHECK
        // ==========================================

        if (session.user.role === "teacher") {

            if (exam.createdById !== session.user.id) {

                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );

            }

        }

        if (session.user.role === "student") {

            const membership =
                await prisma.classroomMember.findFirst({

                    where: {
                        classroomId: exam.classroomId,
                        userId: session.user.id,
                    },

                });

            if (!membership) {

                return NextResponse.json(
                    {
                        error:
                            "You are not a member of this classroom",
                    },
                    {
                        status: 403,
                    }
                );

            }

        }

        // Admin can access everything
        // No additional checks required

        // ==========================================
        // STEP 6 : FETCH ALL SUBMITTED ATTEMPTS
        // ==========================================

        const attempts =
            await prisma.examAttempt.findMany({

                where: {
                    examId,
                    status: "submitted",
                },

                include: {

                    student: {
                        include: {
                            profile: true,
                        },
                    },

                },

                orderBy: {
                    score: "desc",
                },

            });

        if (attempts.length === 0) {

            return NextResponse.json(
                {
                    error:
                        "No submitted attempts found",
                },
                {
                    status: 404,
                }
            );

        }

        // ==========================================
        // STEP 7 : CALCULATE ANALYTICS
        // ==========================================

        let totalScore = 0;

        let highestScore = 0;

        let lowestScore = Infinity;

        for (const attempt of attempts) {

            const score = attempt.score ?? 0;

            totalScore += score;

            if (score > highestScore) {
                highestScore = score;
            }

            if (score < lowestScore) {
                lowestScore = score;
            }

        }

        const averageScore =
            totalScore / attempts.length;

    
        // STEP 8 : BUILD LEADERBOARD DTO
        

        const leaderboard =
            attempts.map((attempt, index) => ({

                rank: index + 1,

                studentId: attempt.student.id,

                studentName:
                    attempt.student.profile?.displayName ??
                    attempt.student.email,

                score: attempt.score,

                submittedAt:
                    attempt.submittedAt,

            }));

       
        // STEP 9 : RETURN RESPONSE
       

        return NextResponse.json(
            {

                exam: {

                    id: exam.id,

                    title: exam.title,

                    totalMarks:
                        exam.totalMarks,

                },

                statistics: {

                    totalStudents:
                        attempts.length,

                    averageScore:
                        Number(
                            averageScore.toFixed(2)
                        ),

                    highestScore,

                    lowestScore,

                },

                leaderboard,

            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.error("Leaderboard Error:", error);
        return NextResponse.json(
            {
                error:"Internal Server Error",
            },
            {
                status: 500,
            }
        );

    }
}