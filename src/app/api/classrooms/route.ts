
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";



export const createClassroomSchema = z.object({

    name: z.string().min(3).max(100),
    subject: z.string().min(2).max(100),
    description: z.string().optional(),

});

/**
 * @swagger
 * /api/classrooms:
 *   post:
 *     tags: [Classrooms]
 *     summary: Teacher creates a classroom
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, subject]
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 100, example: "Grade 10 Mathematics" }
 *               subject: { type: string, minLength: 2, maxLength: 100, example: Mathematics }
 *               description: { type: string, example: "Algebra and Geometry fundamentals for Grade 10" }
 *     responses:
 *       201:
 *         description: Classroom created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 classroom:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     joinCode: { type: string, example: a1b2c3 }
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       404:
 *         description: Teacher not found for session email
 *       500:
 *         description: Validation error or server error
 */
export async function POST(req: Request) {
    try {
        const user = await getServerSession(authOptions);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        if (user.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        // validate the request body using zod schema
        const body = await req.json();
        const { name, description, subject } = createClassroomSchema.parse(body);

        const teacherEmail = user.user.email;

        if (!teacherEmail) {
            return NextResponse.json(
                { error: "User email missing from session" },
                { status: 400 }
            )
        }

        const teacher = await prisma.user.findUnique({
            where: {
                email: teacherEmail,
            }
        });

        if (!teacher) {
            return NextResponse.json(
                { error: "Teacher not found" },
                { status: 404 }
            )
        }


        // generate the unique code for the classroom
        const code = Math.random().toString(36).substring(2, 8);


        // create the classroom in the database
        const classroom = await prisma.classroom.create({
            data: {
                ownerId: teacher.id,
                name: name,
                subject: subject,
                description: description,
                joinCode: code,
            },
        });

        return NextResponse.json(
            { message: "Classroom created successfully", classroom },
            { status: 201 }
        )


    } catch (error) {
        console.error("Error in creating classroom:", error);
        return NextResponse.json(
            { error: "Failed to create classroom" },
            { status: 500 }
        )
    }
}

