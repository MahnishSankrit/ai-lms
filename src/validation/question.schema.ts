
import * as z from "zod";


export const createQuestionSchema = z.object({
    questionText : z.string().min(5),
    type : z.enum(["mcq", "true_false", "short_answer", "multiple_select"]),
    marks : z.number().min(1),
    difficulty: z.string().optional(),
    explanation: z.string().optional(),
    imageUrl: z.string().optional(),
    options : z.array(
        z.object({
            optionText: z.string(),
            isContext: z.boolean(),
        })
    ),
   
})
