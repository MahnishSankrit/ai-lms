
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod";
import { encode } from "next-auth/jwt";

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const SESSION_COOKIE_NAME =
    process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";



export async function POST(req: Request): Promise<NextResponse> {
    try {
        const body = await req.json();
        const parsedBody = userSchema.safeParse(body);

        if (!parsedBody.success) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                {status: 400}
            )
        }

        const { email, password: loginPassword } = parsedBody.data;
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
        const isPasswordCorrect = await bcrypt.compare(loginPassword, user.password)
        if(!isPasswordCorrect){
            return NextResponse.json(
                {error: "Invalid password"},
                {status: 400}
            )
        }

        const sessionToken = await encode({
            token: {
                sub: user.id,
                email: user.email,
                role: user.role,
            },
            secret: process.env.NEXTAUTH_SECRET as string,
            maxAge: 30 * 24 * 60 * 60,
        });

        const { password: passwordHash, ...userWithoutPassword } = user;
        void passwordHash;
        const response = NextResponse.json(
            {message: "Login successful", user: userWithoutPassword},
            {status: 200}
        );

        response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60,
        });

        return response;

    } catch (error) {
        console.error("Error in login:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}
