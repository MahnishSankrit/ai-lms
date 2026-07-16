import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";

const UpdateProfileSchema = z.object({
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
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
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Updated user (without password/verificationToken)
 *       400:
 *         description: "Validation error or any thrown error (including duplicate email), all mapped to 400"
 *       401:
 *         description: Not logged in
 */
export async function PATCH(req: Request){
    try {
        const user = await getServerSession(authOptions);
        if(!user){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }

        const body = await req.json();
        const {email, password: newPassword } = body;

        const validatedData = UpdateProfileSchema.parse({email, password: newPassword});
        const updateData: { email?: string; password?: string } = {};

        if(validatedData.email){
            updateData.email = validatedData.email;
        }
        if(validatedData.password){
            const bcrypt = await import("bcryptjs");
            const hashedPassword = await bcrypt.hash(validatedData.password, 10);
            updateData.password = hashedPassword;
        }

        const userEmail = user.user.email;

        if (!userEmail) {
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            );
        }

        const updatedUser = await prisma.user.update({
            where: {
                email: userEmail,
            },
            data: updateData,
        })

        const { password: passwordHash, verificationToken: verificationTokenValue, ...safeUser } = updatedUser;
        void passwordHash;
        void verificationTokenValue;

        return NextResponse.json(
            {user: safeUser}, 
            {status: 200}
        );

    } catch (error) {
        console.error("Error in updating profile:", error);
        return NextResponse.json(
            {error: "Invalid input data"},
            {status: 400}
        )
    }
}