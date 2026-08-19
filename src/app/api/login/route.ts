
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod";
import { encode } from "next-auth/jwt";
import { verifyPassword } from "@/lib/auth";

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const SESSION_COOKIE_NAME =
    process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";



/**
 * @swagger
 * /api/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive a session cookie
 *     description: Sets the next-auth.session-token (or __Secure- prefixed in production) httpOnly cookie used by every protected route.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: student1@example.com }
 *               password: { type: string, minLength: 6, example: student123 }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Login successful }
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     role: { type: string, enum: [admin, teacher, student] }
 *                     isVerified: { type: boolean }
 *       400:
 *         description: Invalid body shape, email not verified, or wrong password
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request): Promise<NextResponse> {
    try {
        const body = await req.json();
        const parsedBody = userSchema.safeParse(body);


        if (!parsedBody.success) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 400 }
            )
        }

        const { email, password: loginPassword } = parsedBody.data;
        const user = await prisma.user.findUnique({
            where: {
                email,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }
        const emailVerified = user.isVerified;

        if (!emailVerified) {
            return NextResponse.json(
                { error: "Email not verified" },
                { status: 400 }
            )
        }
        const isPasswordCorrect = await verifyPassword(loginPassword, user.password)
        if (!isPasswordCorrect) {
            return NextResponse.json(
                { error: "Invalid password" },
                { status: 400 }
            )
        }

        const sessionToken = await encode({
            token: {
                sub: user.id,
                email: user.email,
                role: user.role,
            },
            secret: process.env.NEXTAUTH_SECRET as string,
            maxAge: 30 * 24 * 60 * 60,
        });

        const { password: passwordHash, ...userWithoutPassword } = user;
        void passwordHash;
        const response = NextResponse.json(
            { message: "Login successful", user: userWithoutPassword },
            { status: 200 }
        );

        response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60,
        });

        return response;

    } catch (error) {
        console.error("Error in login:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
