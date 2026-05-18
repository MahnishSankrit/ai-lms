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
        const {email, password } = RegisterSchema.parse(body);
        if(!email || !password){
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

        const hashPassword = await bcrypt.hash(password, 10);
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

        return NextResponse.json(
            {message: "User created successfully", user},
           
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