
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod"

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})



export async function POST(req: Request): Promise<NextResponse> {
    try {
        const {email, password} = userSchema.parse(req.body);
        if(!email || !password){
            return NextResponse.json(
                {error: "Missing email or password"},
                {status: 400}
            )
        }
        const user = await prisma.user.findUnique({
            where: {
                email,
            }
        })

        if(!user){
            return NextResponse.json(
                {error: "User not found"},
                {status: 404}
            )
        }
        const emailVerified = user.isVerified;

        if(!emailVerified){
            return NextResponse.json(
                {error: "Email not verified"},
                {status: 400}
            )
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if(!isPasswordCorrect){
            return NextResponse.json(
                {error: "Invalid password"},
                {status: 400}
            )
        }

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json(
            {message: "Login successful", user: userWithoutPassword},
            {status: 200}
        )

    } catch (error) {
        console.error("Error in login:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}
