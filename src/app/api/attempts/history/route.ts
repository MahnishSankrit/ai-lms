// API: GET /api/attempts/history

// Purpose:

// Student Dashboard

// Show:

// * Exam Name
// * Score
// * Status
// * Submitted Date

// Example Response:

// [
// {
// "examTitle": "DBMS Mid Sem",
// "score": 80,
// "status": "submitted"
// },
// {
// "examTitle": "OS Quiz",
// "score": 90,
// "status": "submitted"
// }
// ]

// Flow:

// Authentication
// ↓
// Student Check
// ↓
// Get Pagination Params
// ↓
// Find Attempts
// ↓
// Include Exam
// ↓
// Sort By Latest
// ↓
// Return History

// Code:

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/attempts/history:
 *   get:
 *     tags: [Attempts]
 *     summary: Student's paginated exam-attempt history
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated attempt history
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a student
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
    try {


        // ==========================================
        // STEP 1: AUTHENTICATION
        // ==========================================

        const session =
            await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        // ==========================================
        // STEP 2: STUDENT CHECK
        // ==========================================

        if (
            session.user.role !== "student"
        ) {
            return NextResponse.json(
                {
                    error: "Forbidden",
                },
                {
                    status: 403,
                }
            );
        }

        // ==========================================
        // STEP 3: PAGINATION
        // ==========================================

        const { searchParams } =
            new URL(req.url);

        const page = Number(
            searchParams.get("page") || "1"
        );

        const limit = Number(
            searchParams.get("limit") || "10"
        );

        const skip =
            (page - 1) * limit;

        // ==========================================
        // STEP 4: FIND ATTEMPTS
        // ==========================================

        const attempts =
            await prisma.examAttempt.findMany({
                where: {
                    studentId:
                        session.user.id,
                },

                include: {
                    exam: true,
                },

                orderBy: {
                    createdAt: "desc",
                },

                skip,
                take: limit,
            });

        // ==========================================
        // STEP 5: TOTAL COUNT
        // ==========================================

        const totalAttempts =
            await prisma.examAttempt.count({
                where: {
                    studentId:
                        session.user.id,
                },
            });

        // ==========================================
        // STEP 6: RETURN RESPONSE
        // ==========================================

        return NextResponse.json(
            {
                page,
                limit,

                totalAttempts,

                totalPages: Math.ceil(
                    totalAttempts / limit
                ),

                attempts,
            },
            {
                status: 200,
            }
        );

    } catch (error) {

        console.error(
            "Error fetching history:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }


}
