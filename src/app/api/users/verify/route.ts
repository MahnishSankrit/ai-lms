import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Lets the admin mark a user's email as verified by hand -- e.g. when the
// verification email never arrived. Login rejects unverified users, so
// without this the admin had no way to help them.

/**
 * @swagger
 * /api/users/verify:
 *   patch:
 *     tags: [Users]
 *     summary: Admin manually marks a user's email as verified
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id: { type: string }
 *     responses:
 *       200:
 *         description: User verified
 *       400:
 *         description: Missing id
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not an admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function PATCH(req: Request) {
    try {
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

        const body = await req.json();
        const { id } = body;
        if (!id || typeof id !== "string") {
            return NextResponse.json(
                { error: "User id is required" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                isVerified: true,
                // the emailed link is no longer needed
                verificationToken: null,
            },
            select: {
                id: true,
                email: true,
                isVerified: true,
            },
        });

        return NextResponse.json(
            { message: "User verified", user: updatedUser },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in verifying user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
