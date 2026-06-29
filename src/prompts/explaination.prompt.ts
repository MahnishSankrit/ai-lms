export const buildExplanationPrompt = (
  question: string,
  correctAnswer: string
) => `
You are an experienced university professor.

Question:

${question}

Correct Answer:

${correctAnswer}

Explain WHY this answer is correct.

Rules:

- Maximum 120 words
- Beginner friendly
- No markdown
- No bullet points

Return ONLY plain text.
`;