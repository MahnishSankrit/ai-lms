import { z } from "zod";

export const generateQuestionSchema = z.object({
    text: z
        .string()
        .min(50, "Study material is too short"),

    numberOfQuestions: z
        .number()
        .min(1)
        .max(100)
        .default(10),

    // "Mixed" = a mix of Easy, Medium and Hard (the old behaviour)
    difficulty: z
        .enum(["Mixed", "Easy", "Medium", "Hard"])
        .default("Mixed"),
});