// this file will constain 
// generateQuestions(text)

// generateAnswers(text)

// summarize(text)

// generateExplanation(text)

import { model } from "@/lib/gemini";
import { buildQuestionPrompt } from "@/prompts/generateQuestions";
import { buildAnswerPrompt } from "@/prompts/answer.prompt";
import { buildExplanationPrompt } from "@/prompts/explaination.prompt";
import { buildSummaryPrompt } from "@/prompts/summary.prompt";
import { aiQuestionsResponseSchema, type AIQuestion } from "@/validation/ai.schema";




// export class AIService {

//     private async callAI(prompt: string): Promise<string> {
//         const result = await model.generateContent(prompt)
//         const res = result.response
//         return res.text();
//     }

//      // now 
// // generateQuestions()

// // ↓

// // callAI()

// // ↓

// // Gemini


//         async generateQuestions(text: string): Promise<AIQuestion[]> {
//         // logic to generate questions from the text
//         // step 1 build prompt
//         const prompt = buildQuestionPrompt(text);
//         // step 2 sending the prompt to the ai model
//         const response = await this.callAI(prompt);
//         // step 3 receice the response from the ai model and parse it to get the questions
//         const questions = this.cleanResonse(response);
//         // step 4 convert the response into json

//             const parsedQuestions = JSON.parse(questions);
//             return aiQuestionsResponseSchema.parse(parsedQuestions);


//     }

//     async generateAnswers(text: string): Promise<string[]> {
//         // logic to generate answers from the text
//         const prompt  = buildAnswerPrompt(text, ["Option 1", "Option 2", "Option 3", "Option 4"]);
//         const response = await this.callAI(prompt);
//         const answers = this.cleanResonse(response);
//         return JSON.parse(answers);
//     }

//     async summarize(text: string): Promise<string> {
//         // logic to summarize the text
//         const prompt = buildSummaryPrompt(text);

//         const response = await this.callAI(prompt);
//         const summary = this.cleanResonse(response);

//         return summary;
//     }

//     async generateExplanation(text: string): Promise<string> {
//         // logic to generate explanation from the text
//         const prompt = buildExplanationPrompt(text, "Correct Answer");
//         const response = await this.callAI(prompt);
//         return this.cleanResonse(response);
//     }

//     private cleanResonse(response: string): string {
//         // logic to clean the response from the ai model
//         // step 1 remove any markdown from the response
//         const cleanedResponse = response.replace(/```/g, "").trim();
//         return cleanedResponse;
//     }

// }





export class AIService {
    /**
     * Generic method to call Gemini
     */
    private async callAI(prompt: string): Promise<string> {
        const result = await model.generateContent(prompt);

        const response = await result.response;

        return response.text();
    }

    /**
     * Remove markdown returned by Gemini
     */
    private cleanResponse(response: string): string {
        return response
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
    }

    /**
     * Generate MCQs from extracted PDF text
     */
    async generateQuestions(
        text: string,
        numberOfQuestions: number = 10
    ): Promise<AIQuestion[]> {
        const prompt = buildQuestionPrompt(
            text,
            numberOfQuestions
        );

        const rawResponse = await this.callAI(prompt);

        const cleanedResponse =
            this.cleanResponse(rawResponse);

        try {
            const parsedResponse =
                JSON.parse(cleanedResponse);

            const validatedQuestions =
                aiQuestionsResponseSchema.parse(
                    parsedResponse
                );

            return validatedQuestions;
        } catch (error) {
            console.error(
                "Invalid AI Question Response:",
                error
            );

            throw new Error(
                "Failed to parse AI generated questions."
            );
        }
    }

    /**
     * Generate correct answer for a question
     */
    async generateAnswers(
        question: string,
        options: string[]
    ) {
        const prompt = buildAnswerPrompt(
            question,
            options
        );

        const rawResponse = await this.callAI(prompt);

        const cleanedResponse =
            this.cleanResponse(rawResponse);

        try {
            return JSON.parse(cleanedResponse);
        } catch (error) {
            console.error(
                "Invalid AI Answer Response:",
                error
            );

            throw new Error(
                "Failed to parse AI generated answer."
            );
        }
    }

    /**
     * Summarize study material
     */
    async summarize(
        text: string
    ): Promise<string> {
        const prompt =
            buildSummaryPrompt(text);

        const rawResponse =
            await this.callAI(prompt);

        return this.cleanResponse(rawResponse);
    }

    /**
     * Generate explanation for a question
     */
    async generateExplanation(
        question: string,
        correctAnswer: string
    ): Promise<string> {
        const prompt =
            buildExplanationPrompt(
                question,
                correctAnswer
            );

        const rawResponse =
            await this.callAI(prompt);

        return this.cleanResponse(rawResponse);
    }
}

export const aiService = new AIService();