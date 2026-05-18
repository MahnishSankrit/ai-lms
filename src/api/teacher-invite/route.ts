
import {prisma} from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mail";
import * as z from "zod";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

const inviteTeacherSchema = z.object({
    email: z.string().email(),
})


export async function POST(req: Request){
    try {
        const {email} = await req.json();
        const currentUser = await prisma.user.findUnique({
            where: {
                email,
            }
        })
        if(!currentUser || currentUser.role !== "admin"){
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
                email,
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
                email,
                token,
                expiresAt: expiryAt,
                invitedById: currentUser.id,
            }
        })

        const inviteLink = `${process.env.URL}/teacher-invite/accept?token=${token}`;
        console.log("Invite link:", inviteLink); // for testing purposes, we can log the invite link to the console, in production we will send the invite link to the user's email

        await sendVerificationEmail(email, token); // we can reuse the same function to send the email, but we need to modify the function to send a different email for teacher invite 
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
