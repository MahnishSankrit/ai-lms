import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as z from "zod";
import { sendVerificationEmail } from "@/lib/mail";

// Rules for every register field. If one fails, its message is sent back
// to the page (e.g. "Phone number must be 10 digits").
const RegisterSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    // 3-20 characters: letters, numbers and underscore only (like "rahul_21")
    username: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9_]{3,20}$/, "Username must be 3-20 letters, numbers or _"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    studentId: z.string().trim().min(1, "Student ID is required"),
    // Indian mobile number: exactly 10 digits
    phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
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
 *             required: [firstName, lastName, username, email, password, studentId, phone]
 *             properties:
 *               firstName: { type: string, example: Rahul }
 *               lastName: { type: string, example: Sharma }
 *               username: { type: string, example: rahul_21, description: "3-20 letters, numbers or _" }
 *               email: { type: string, format: email, example: student1@example.com }
 *               password: { type: string, minLength: 8, example: student123 }
 *               studentId: { type: string, example: 21CS045 }
 *               phone: { type: string, example: "9876543210", description: "10 digits" }
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
 *         description: Invalid field, or email/username already taken
 *       500:
 *         description: Validation error or server error
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Step 1: check every field. safeParse doesn't throw -- it tells us
        // whether the data is OK, so we can send a clear message back.
        const result = RegisterSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            )
        }
        const { firstName, lastName, username, email, password: registerPassword, studentId, phone } = result.data;

        // Step 2: email and username must not already be taken.
        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 400 }
            )
        }

        const usernameTaken = await prisma.userProfile.findUnique({
            where: { username },
        })

        if (usernameTaken) {
            return NextResponse.json(
                { error: "That username is already taken" },
                { status: 400 }
            )
        }

        const hashPassword = await bcrypt.hash(registerPassword, 10);
        const verificationToken = randomUUID(); // thus will be used to verify the user's email

        // Step 3: create the user AND their profile in one go.
        // "profile: { create: ... }" is a Prisma nested create -- it makes
        // the user_profiles row and links it to this user automatically.
        const user = await prisma.user.create({
            data: {
                email,
                password: hashPassword,
                role: "student",
                verificationToken,
                profile: {
                    create: {
                        displayName: firstName + " " + lastName,
                        firstName,
                        lastName,
                        username,
                        studentId,
                        phone,
                    },
                },
            }
        })

        try {
            await sendVerificationEmail(email, verificationToken);
        } catch (emailError) {
            console.error("Verification email could not be sent:", emailError);
            await prisma.user.delete({ where: { id: user.id } });
            return NextResponse.json(
                { error: "Account could not be created because the verification email could not be sent" },
                { status: 503 }
            );
        }

        const { password: passwordHash, verificationToken: verificationTokenValue, ...safeUser } = user;
        void passwordHash;
        void verificationTokenValue;

        return NextResponse.json(
            { message: "Account created. Check your email to verify your account before logging in.", user: safeUser },

            { status: 201 }
        )



    } catch (error) {
        console.error("Error in registration:", error);
        return NextResponse.json(

            { error: "Failed to create user" },
            { status: 500 }
        )
    }
}