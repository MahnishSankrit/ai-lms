
import {prisma} from "@/lib/prisma";
import { sendTeacherInviteEmail } from "@/lib/mail";
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
        console.log("Invite link:", inviteLink);

        // The invite record already exists at this point, so a failed send
        // (e.g. Resend's sandbox sender can't deliver to arbitrary emails)
        // shouldn't fail the whole request -- the link is returned either
        // way so the admin can copy/share it directly.
        let emailSent = true;
        try {
            await sendTeacherInviteEmail(teacherEmail, token);
        } catch (emailError) {
            console.error("Error sending teacher invite email:", emailError);
            emailSent = false;
        }

        return NextResponse.json(
            { message: "Teacher invite created", inviteLink, emailSent },
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
