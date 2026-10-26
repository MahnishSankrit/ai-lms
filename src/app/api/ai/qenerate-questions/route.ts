import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { aiService } from "@/services/ai.service";
import { generateQuestionSchema } from "@/validation/generate-question.schema";
import { ZodError } from "zod";
// import { constrainedMemory } from "process";
import { consumeAiQuota, refundAiQuota, DAILY_AI_LIMIT } from "@/lib/ai-quota";


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
 *       429:
 *         description: Daily AI quota reached
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

        const userId = session.user.id;
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check the daily quota (only after validation, so a bad request doesn't use up a try)
        const allowed = await consumeAiQuota(userId);
        if (!allowed) {
            return NextResponse.json(
                { error: `Daily limit reached (${DAILY_AI_LIMIT} per day). Try again tomorrow.` },
                { status: 429 }
            );
        }

        // Generate AI Questions (if Gemini fails, give the request back)
        let questions;
        try {
            questions = await aiService.generateQuestions(
                text,
                numberOfQuestions
            );
        } catch (error) {
            await refundAiQuota(userId);
            throw error;   // the outer catch still returns the 500
        }


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