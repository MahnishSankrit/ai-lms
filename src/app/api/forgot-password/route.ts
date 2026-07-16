import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as z from "zod";
import { sendVerificationEmail } from "@/lib/mail";


const ForgotPasswordSchema = z.object({
    email: z.string().email(),
})

/**
 * @swagger
 * /api/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: student1@example.com }
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: No user with that email
 *       500:
 *         description: Invalid email format or server error
 */
export async function POST(req: Request): Promise<NextResponse>{
    try {
        const body = await req.json();
        const {email} = ForgotPasswordSchema.parse(body);

        const user = await prisma.user.findUnique({ 
            where: {
                email,
            }
        })
        // verify if the user exists, if not return an error, otherwise generate a token and save it to the database, then send an email to the user with the token, thus the user can use the token to reset their password
        if(!user){
            return NextResponse.json(
                {error: "User not found"},
                {status: 404}
            )
        }
        // generate a token and save it to the database, then send an email to the user with the token, thus the user can use the token to reset their password
        const token = randomUUID();
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt: new Date(Date.now() + 3600000),
            },
        })
        // sending the email to the user with the token, thus the user can use the token to reset their password, we can reuse the same function to send the email, but we need to modify the function to send a different email for password reset
        await sendVerificationEmail(email, token); // thus we can reuse the same function to send the email, but we need to modify the function to send a different email for password reset

        return NextResponse.json(
            {message: "Password reset email sent"},
            {status: 200}
        )

    } catch (error) {
        console.error("Error in forgot password:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}


