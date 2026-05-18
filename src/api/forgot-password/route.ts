import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as z from "zod";
import { sendVerificationEmail } from "@/lib/mail";


const ForgotPasswordSchema = z.object({
    email: z.string().email(),
})

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
        // save the token to the database
        await prisma.user.update({
            where: {
                email,
            },
            data: {
                resetPasswordToken: token,
                resetPasswordTokenExpiry: new Date(Date.now() + 3600000), // token will expire in 1 hour
            }
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


