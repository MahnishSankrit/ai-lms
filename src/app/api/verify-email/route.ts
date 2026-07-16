import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verify a user's email using the token from registration
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Value of users.verificationToken for the registered user
 *     responses:
 *       200:
 *         description: Email verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       400:
 *         description: Missing token, or no user matches it
 */
export async function GET(req: Request) {

    const { searchParams } = new URL(req.url);

    const token = searchParams.get("token");

    if (!token) {
        return Response.json(
            {
                error: "Invalid token",
            },
            { status: 400 }
        );
    }

    const user = await prisma.user.findFirst({
        where: {
            verificationToken: token,
        },
    });

    if (!user) {
        return Response.json(
            {
                error: "Invalid token",
            },
            { status: 400 }
        );
    }

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            isVerified: true,
            verificationToken: null,
        },
    });

    return Response.json({
        success: true,
    });
}