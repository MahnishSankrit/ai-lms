export const buildAnswerPrompt = (
  question: string,
  options: string[]
) => `
You are an expert teacher.

Your task is to identify the correct answer.

Question:

${question}

Options:

${options.map((option, index) => `${index + 1}. ${option}`).join("\n")}

Return ONLY JSON.

{
  "correctAnswer": "Library",
  "correctOptionIndex": 2,
  "reason": "React is a JavaScript library used for building user interfaces."
}
`;