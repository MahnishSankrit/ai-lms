import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { aiService } from "@/services/ai.service";
import { generateQuestionSchema } from "@/validation/generate-question.schema";
import { ZodError } from "zod";
// import { constrainedMemory } from "process";

/**
 * @swagger
 * /api/ai/qenerate-questions:
 *   post:
 *     tags: [AI]
 *     summary: Generate AI questions from study-material text via Gemini
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string, minLength: 50, description: "Study material, e.g. output of /api/ai/extract-pdf" }
 *               numberOfQuestions: { type: number, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       200:
 *         description: "Questions generated successfully (array shape is compatible with POST /api/questions/bulk)"
 *       400:
 *         description: text < 50 chars, or numberOfQuestions out of range
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       500:
 *         description: Gemini call failed, or response wasn't valid/parsable JSON
 */
export async function POST(req: Request) {
    try {

        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // Validate request body
        const body = await req.json();

        const validatedBody = generateQuestionSchema.parse(body);

        const { text, numberOfQuestions } = validatedBody;

        // Generate AI Questions
        const questions = await aiService.generateQuestions(
            text,
            numberOfQuestions
        );

        if (!questions || questions.length === 0) {
            return NextResponse.json(
                { error: "Failed to generate questions" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: "Questions generated successfully",
                questions,
            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.error("Error in POST /api/ai/qenerate-questions:", error);
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    error: "Invalid request body",

                },
                {
                    status: 400,
                }
            );
        }

        console.error("Error generating questions:", error);

        return NextResponse.json(
            {
                error: "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }
}