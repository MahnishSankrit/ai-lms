// Lets the logged-in user change their own email and/or password.
// Every change needs the CURRENT password, so someone using an unlocked
// computer can't take over the account. Changing the email marks the
// account unverified and emails a new verification link to the new address.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions, verifyPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";
import * as z from "zod";

const UpdateProfileSchema = z.object({
    email: z.string().email().optional(),
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
})

/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Logged-in user updates their own email and/or password
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: "Updated. emailChanged=true means the user must verify the new email before logging in again"
 *       400:
 *         description: Validation error, wrong current password, or email already in use
 *       401:
 *         description: Not logged in
 */
export async function PATCH(req: Request){
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const body = await req.json();
        const result = UpdateProfileSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            )
        }
        const { email, currentPassword, newPassword } = result.data;

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        // Step 1: check the current password.
        const passwordIsCorrect = await verifyPassword(currentPassword, user.password);
        if (!passwordIsCorrect) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 400 }
            )
        }

        const updateData: {
            email?: string;
            password?: string;
            isVerified?: boolean;
            verificationToken?: string;
        } = {};

        // Step 2: new password (optional).
        if (newPassword) {
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        // Step 3: new email (optional) -> needs re-verification.
        let emailChanged = false;
        if (email && email !== user.email) {
            const emailTaken = await prisma.user.findUnique({
                where: { email },
            });
            if (emailTaken) {
                return NextResponse.json(
                    { error: "That email is already in use" },
                    { status: 400 }
                )
            }

            const token = crypto.randomUUID();

            // Send the email BEFORE saving, so if sending fails the
            // account isn't left unverified with no way to verify it.
            await sendVerificationEmail(email, token);

            updateData.email = email;
            updateData.isVerified = false;
            updateData.verificationToken = token;
            emailChanged = true;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData,
        })

        return NextResponse.json(
            { message: "Profile updated", emailChanged },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error in updating profile:", error);
        return NextResponse.json(
            { error: "Could not update profile. Please try again." },
            { status: 500 }
        )
    }
}
