import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


/**
 * @swagger
 * /api/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using a forgot-password token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currToken, newPassword]
 *             properties:
 *               currToken: { type: string, description: "PasswordResetToken.token value", example: b6e1a9d2-0000-0000-0000-000000000000 }
 *               newPassword: { type: string, example: newStudent123 }
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Missing fields, invalid/expired/used token, or user not found for token
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request){
    try {
        const {currToken , newPassword} = await req.json();
        if(!currToken || !newPassword){
            return NextResponse.json(
                {error: "Missing token or new password"},
                {status: 400}
            )
        }

        // Look up the token in the PasswordResetToken table (schema has a separate model)
        const tokenRecord = await prisma.passwordResetToken.findFirst({
            where: {
                token: currToken,
                expiresAt: {
                    gt: new Date(), // token not expired
                }
            }
        })

        if (!tokenRecord) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({ where: { email: tokenRecord.email } })

        if (!user) {
            return NextResponse.json(
                { error: "User not found for token" },
                { status: 400 }
            )
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: newPasswordHash }
        })

        // remove the used token
        await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } })



        return NextResponse.json(
            {message: "Password reset successful"},
            {status: 200}
        )   
    } catch (error) {
        console.error("Error in reset password:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}