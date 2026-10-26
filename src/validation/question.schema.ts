import * as z from "zod";

export const createQuestionSchema = z.object({

    questionText: z.string().min(5),

    type: z.enum([
        "mcq",
        "true_false",
        "short_answer",
        "multiple_select",
    ]),

    marks: z.number().min(1),

    difficulty: z.string().optional(),

    // Which question bank this question belongs to
    bankName: z.string().trim().max(100).optional(),

    explanation: z.string().optional(),

    imageUrl: z.string().optional(),

    options: z.array(

        z.object({

            optionText: z.string(),

            isCorrect: z.boolean(),

        })

    ).min(2),

});