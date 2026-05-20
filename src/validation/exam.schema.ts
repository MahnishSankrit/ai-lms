
import * as z from "zod";


export const createExamSchema = z.object({

  classroomId: z.string(),

  title: z.string()
    .min(3)
    .max(100),

  description: z.string()
    .optional(),

  instructions: z.string()
    .optional(),

  durationMinutes: z.number()
    .min(1),

  totalMarks: z.number()
    .min(1),

  passingMarks: z.number()
    .optional(),

  negativeMarking: z.number()
    .optional(),

  shuffleQuestions: z.boolean(),

  shuffleOptions: z.boolean(),

  fullscreenRequired: z.boolean(),

  status: z.enum(["draft", "published", "ongoing", "completed"]).optional(),

  startsAt: z.string().optional(),

  endsAt: z.string().optional(),
});