import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as z from "zod";
import { sendVerificationEmail } from "@/lib/mail";

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})



export async function POST(req: Request){
    try {
        const body = await req.json();
        const {email, password: registerPassword } = RegisterSchema.parse(body);
        if(!email || !registerPassword){
            throw new Error("missing email or password");
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            }
        })

        if(existingUser){
            return NextResponse.json(
                {error: "User already exists"},
                {status: 400}
            )
        }

        const hashPassword = await bcrypt.hash(registerPassword, 10);
        const verificationToken = randomUUID(); // thus will be used to verify the user's email

        const user = await prisma.user.create({
            data: {
                email,
                password : hashPassword,
                role: "student",
                verificationToken,
            }
        })

        await sendVerificationEmail(email, verificationToken); 

        const { password: passwordHash, verificationToken: verificationTokenValue, ...safeUser } = user;
        void passwordHash;
        void verificationTokenValue;

        return NextResponse.json(
            {message: "User created successfully", user: safeUser},
           
            {status: 201}
        )


        
    } catch (error) {
        console.error("Error in registration:", error);
        return NextResponse.json(

            {error: "Failed to create user"},
            {status: 500}
        )
    }
}