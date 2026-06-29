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
});