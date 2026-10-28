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
 *       400:
 *         description: Invalid page, limit, sortBy or type
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
        const page = Number(searchParams.get("page") || "1");
        const limit = Number(searchParams.get("limit") || "10");
        const sortBy = searchParams.get("sortBy") || "createdAt";
        const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

        // Bad input (page=-1, limit=abc) used to reach Prisma and crash with a 500
        if (!Number.isInteger(page) || page < 1) {
            return NextResponse.json(
                { error: "page must be a whole number of 1 or more" },
                { status: 400 }
            )
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            return NextResponse.json(
                { error: "limit must be a whole number between 1 and 100" },
                { status: 400 }
            )
        }
        // sortBy goes straight into orderBy, so only allow real columns
        const allowedSortFields = ["createdAt", "updatedAt", "questionText", "difficulty", "marks", "type"];
        if (!allowedSortFields.includes(sortBy)) {
            return NextResponse.json(
                { error: "Invalid sortBy" },
                { status: 400 }
            )
        }
        const allowedTypes = ["mcq", "multiple_select", "true_false", "short_answer"];
        if (typeFilter && !allowedTypes.includes(typeFilter)) {
            return NextResponse.json(
                { error: "Invalid type" },
                { status: 400 }
            )
        }

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

        // "__none__" = questions that aren't in any named bank
        const bankFilter = searchParams.get("bank");
        if (bankFilter === "__none__") {
            where.bankName = null;
        } else if (bankFilter) {
            where.bankName = bankFilter;
        }


        const questions = await prisma.question.findMany({
            where,
            include: {
                options: true,
            },
            orderBy: {
                [sortBy]: sortOrder,
            },
            skip: (page - 1) * limit,
            take: limit,
        })

        // Same pagination shape as /api/questions/get-questions, so the
        // frontend can show "Page X of Y" regardless of which endpoint
        // it's currently using.
        const totalCount = await prisma.question.count({ where });
        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json(
            {
                message: "Questions fetched successfully",
                data: questions,
                totalCount,
                totalPages,
                currentPage: page,
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

