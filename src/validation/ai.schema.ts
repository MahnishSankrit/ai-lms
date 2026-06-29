import { z } from "zod";

// Option Schema


export const aiQuestionOptionSchema = z.object({
  optionText: z
    .string()
    .min(1, "Option text is required"),

  isCorrect: z.boolean(),
});


// Question Schema


export const aiQuestionSchema = z.object({
  questionText: z
    .string()
    .min(5, "Question text is too short"),

  type: z.enum([
    "mcq",
    "multiple_select",
    "true_false",
    "short_answer",
  ]),

  marks: z
    .number()
    .int()
    .positive()
    .max(10),

  difficulty: z.enum([
    "Easy",
    "Medium",
    "Hard",
  ]),

  explanation: z
    .string()
    .optional(),

  options: z
    .array(aiQuestionOptionSchema)
    .min(2)
    .max(6),
});


// AI Response


export const aiQuestionsResponseSchema = z.array(
  aiQuestionSchema
);


// Types


export type AIQuestion =
  z.infer<typeof aiQuestionSchema>;

export type AIQuestionOption =
  z.infer<typeof aiQuestionOptionSchema>;