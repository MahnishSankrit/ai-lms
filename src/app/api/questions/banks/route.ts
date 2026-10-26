// Lists the names of the teacher's question banks, with how many
// questions are in each. Used for the bank dropdowns/suggestions.
// Questions with no bank name are returned as bankName: null.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/questions/banks:
 *   get:
 *     tags: [Questions]
 *     summary: List the teacher's question bank names with question counts
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: "{ banks: [{ bankName, count }] }"
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       500:
 *         description: Server error
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.role !== "teacher") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const groups = await prisma.question.groupBy({
            by: ["bankName"],
            where: { createdById: session.user.id },
            _count: { _all: true },
            orderBy: { bankName: "asc" },
        });

        const banks = groups.map((group) => ({
            bankName: group.bankName,
            count: group._count._all,
        }));

        return NextResponse.json({ banks }, { status: 200 });
    } catch (error) {
        console.error("Error listing question banks:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
