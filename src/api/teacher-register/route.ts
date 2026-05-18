import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const teacherRegisterSchema = z.object({
    token: z.string(),
    name: z.string().min(3),
    password: z.string().min(6),
});


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedData = teacherRegisterSchema.parse(body);
        const { token, name, password } = validatedData;

        //veify token exist and not used
        const invite = await prisma.teacherInvite.findUnique({
            where: {
                token,
            }
        })
        if (!invite) {
            return new Response(
                JSON.stringify({ error: "Invalid token" }),
                { status: 400 }
            )
        }
        if (invite.used) {
            return new Response(
                JSON.stringify({ error: "Token already used" }),
                { status: 400 }
            )
        }

        // prevent token reuse by marking it as used because it this is not here then token could create multiple accounts until the token expires, thus it is important to mark the token as used
        if (invite.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
            return new Response(
                JSON.stringify({ error: "Token expired" }),
                { status: 400 }
            )
        }

        // checking if the user already exists, if yes then return an error
        const existingUser = await prisma.user.findUnique({
            where: {
                email: invite.email,
            }
        })
        if (existingUser) {
            return new Response(
                JSON.stringify({ error: "User already exists" }),
                { status: 400 }
            )
        }

        const hashPassword = await bcrypt.hash(password, 10);
        // create the teacher account
        const user = await prisma.user.create({
            data: {
                email: invite.email,
                password: hashPassword,
                name,
                role: "teacher",
                // since the teacher is invited by the admin, thus we can consider the email as verified, thus we can set isVerified to true
            }
        })
        await prisma.teacherInvite.update({
            where: {
                token,
            },
            data: {
                used: true,
            },
        });
        return Response.json(
            { message: "Teacher registered successfully", user },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error in teacher registration:", error);
        return Response.json(
            { error: "Failed to register teacher" },
            { status: 500 }
        )
    }
}
