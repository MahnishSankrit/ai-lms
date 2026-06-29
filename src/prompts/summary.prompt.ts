export const buildSummaryPrompt = (
  studyMaterial: string
) => `
You are an expert academic tutor.

Summarize the following study material.

Rules:

1. Keep important concepts.
2. Remove unnecessary details.
3. Use headings.
4. Use bullet points.
5. Keep technical terms.
6. Maximum 500 words.

Study Material:

${studyMaterial}

Return only the summary.
`;