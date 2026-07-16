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



/**
 * @swagger
 * /api/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new student account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: student1@example.com }
 *               password: { type: string, minLength: 6, example: student123 }
 *     responses:
 *       201:
 *         description: User created. Verification email sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: User created successfully }
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     role: { type: string, example: student }
 *                     isVerified: { type: boolean, example: false }
 *       400:
 *         description: User already exists
 *       500:
 *         description: Validation error or server error
 */
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