import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, QuestionType } from "@prisma/client";

// 1. Authentication
// 2. Ownership filtering
// 3. Search query
// 4. Optional filters
// 5. Pagination
// 6. Sorting
// 7. Return results

/**
 * @swagger
 * /api/questions/search:
 *   get:
 *     tags: [Questions]
 *     summary: Search/filter/sort/paginate the teacher's question bank
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Case-insensitive substring match on questionText
 *       - in: query
 *         name: difficulty
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [mcq, multiple_select, true_false, short_answer] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Matching questions
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const teacherId = session.user.id;
        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(req.url)
        const searchQuery = searchParams.get("q") || "";
        const difficultyFilter = searchParams.get("difficulty");
        const typeFilter = searchParams.get("type");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const sortBy = searchParams.get("sortBy") || "createdAt";
        const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

        const where: Prisma.QuestionWhereInput = {
            createdById: teacherId,
        };

        if (searchQuery) {
            where.questionText = {
                contains: searchQuery,
                mode: "insensitive",
            };
        }

        if (difficultyFilter) {
            where.difficulty = {
                contains: difficultyFilter,
                mode: "insensitive",
            };
        }

        if (typeFilter) {
            where.type = typeFilter as QuestionType;
        }


        const questions = await prisma.question.findMany({
            where,
            orderBy: {
                [sortBy]: sortOrder,
            },
            skip: (page - 1) * limit,
            take: limit,
        })


        return NextResponse.json(
            { 
                message: "Questions fetched successfully",
                data: questions 
            },
            { status: 200 }
        )


    } catch (error) {
        console.error("Error searching questions:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}

