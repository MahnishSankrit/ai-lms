// Admin resets a teacher's AI quota for today

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resetAiQuota } from "@/lib/ai-quota";
import { ZodError } from "zod";
import * as z from "zod";

const resetQuotaSchema = z.object({
    userId: z.string().min(1),
});

/**
 * @swagger
 * /api/ai/quota/reset:
 *   post:
 *     tags: [AI]
 *     summary: Admin resets a teacher's daily AI quota
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200:
 *         description: Quota reset
 *       400:
 *         description: Invalid body, or user is not a teacher
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not an admin
 *       404:
 *         description: User not found
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { userId } = resetQuotaSchema.parse(body);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.role !== "teacher") {
            return NextResponse.json({ error: "User is not a teacher" }, { status: 400 });
        }

        await resetAiQuota(userId);

        return NextResponse.json(
            { message: "AI quota reset successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in POST /api/ai/quota/reset:", error);
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
