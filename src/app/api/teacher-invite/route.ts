
import {prisma} from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mail";
import * as z from "zod";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inviteTeacherSchema = z.object({
    email: z.string().email(),
})


/**
 * @swagger
 * /api/teacher-invite:
 *   post:
 *     tags: [Auth]
 *     summary: Admin invites a new teacher by email
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: newteacher@example.com }
 *     responses:
 *       200:
 *         description: Invite sent. Copy the token printed to the server console log.
 *       400:
 *         description: User already exists, or an unused invite already exists for this email
 *       403:
 *         description: Not logged in as admin
 *       500:
 *         description: Invalid email or email/DB error
 */
export async function POST(req: Request){
    try {
        const session = await getServerSession(authOptions);
        if(!session || session.user.role !== "admin"){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 403}
            )
        }

        const body = await req.json();
        const validatedData = inviteTeacherSchema.parse(body);
        const {email : teacherEmail} = validatedData;

        const existingUser = await prisma.user.findUnique({
            where: {
                email: teacherEmail,
            }
        })
        if(existingUser){
            return NextResponse.json(
                {error: "User already exists"},
                {status: 400}
            )
        }

        const existingInvite = await prisma.teacherInvite.findUnique({
            where: {
                email: teacherEmail,
            }
        })
        if(existingInvite && !existingInvite.used){
            return NextResponse.json(
                {error: "Invite already sent to this email"},
                {status: 400}
            )
        }

        const token = randomUUID();
        const expiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // invite will expire in 7 days

        await prisma.teacherInvite.create({
            data: {
                email: teacherEmail,
                token,
                expiresAt: expiryAt,
            }
        })

        const inviteLink = `${process.env.URL}/teacher-invite/accept?token=${token}`;
        console.log("Invite link:", inviteLink); // for testing purposes, we can log the invite link to the console, in production we will send the invite link to the user's email

        await sendVerificationEmail(teacherEmail, token); // we can reuse the same function to send the email, but we need to modify the function to send a different email for teacher invite 
        return NextResponse.json(
            {message: "Teacher invite sent successfully"},
            {status: 200}
        )


    } catch (error) {
        console.error("Error inviting teacher:", error);
        return NextResponse.json(
            {error: "Failed to send teacher invite"},
            {status: 500}
        )
    }
}
