export const buildQuestionPrompt = (
  studyMaterial: string,
  numberOfQuestions: number = 10,
  difficulty: string = "Mixed"
) => `
You are an expert university professor and examination paper setter.

Your task is to generate ${numberOfQuestions} high-quality Multiple Choice Questions (MCQs) from the study material provided below.

==========================
RULES
==========================

1. Return ONLY valid JSON.
2. Do NOT include markdown.
3. Do NOT include \`\`\`json.
4. Do NOT include explanations outside JSON.
5. Generate questions only from the provided content.
6. Avoid duplicate questions.
7. ${difficulty === "Mixed"
    ? "Mix Easy, Medium, and Hard questions."
    : `Every question must be ${difficulty} difficulty, and "difficulty" must be "${difficulty}".`}
8. Every question must have exactly four options.
9. Exactly ONE option must have "isCorrect": true.
10. Marks should be 1.

==========================
JSON FORMAT
==========================

[
  {
    "questionText": "What is React?",
    "type": "mcq",
    "marks": 1,
    "difficulty": "Easy",
    "explanation": "React is a JavaScript library for building user interfaces.",
    "options": [
      {
        "optionText": "Framework",
        "isCorrect": false
      },
      {
        "optionText": "Library",
        "isCorrect": true
      },
      {
        "optionText": "Database",
        "isCorrect": false
      },
      {
        "optionText": "Operating System",
        "isCorrect": false
      }
    ]
  }
]

==========================
STUDY MATERIAL
==========================

${studyMaterial}
`;