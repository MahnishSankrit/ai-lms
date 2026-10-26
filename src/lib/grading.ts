import { prisma } from "@/lib/prisma";

// Grades every answer already saved for an attempt: for each one, checks
// the selected option against the correct answer, records isCorrect and
// marksAwarded on that AttemptAnswer, and returns the total score.
//
// Used anywhere an attempt gets marked as done -- a normal submit, a
// teacher force-submit, or an auto-submit after too many anti-cheat
// violations -- so the grading logic only lives in one place.
export async function gradeAttempt(attemptId: string): Promise<number> {
    const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
    });
    if (!attempt) {
        return 0;
    }

    // Only questions that are actually in this exam can earn marks
    const examQuestions = await prisma.examQuestion.findMany({
        where: { examId: attempt.examId },
        select: { questionId: true },
    });
    const examQuestionIds = examQuestions.map((examQuestion) => examQuestion.questionId);

    const answers = await prisma.attemptAnswer.findMany({
        where: { attemptId },
    });

    let finalScore = 0;

    for (const answer of answers) {
        // Unanswered (or short-answer, awaiting manual grading) questions
        // have no selectedOptionId -- leave isCorrect/marksAwarded as null.
        if (!answer.selectedOptionId) {
            continue;
        }

        const selectedOption = await prisma.questionOption.findUnique({
            where: { id: answer.selectedOptionId },
        });
        if (!selectedOption) continue;

        const question = await prisma.question.findUnique({
            where: { id: answer.questionId },
        });
        if (!question) continue;

        // An answer only counts if the question is in this exam AND the
        // picked option belongs to that same question. Otherwise someone
        // could submit a known-correct option id from a different question.
        let isCorrect = selectedOption.isCorrect;
        if (!examQuestionIds.includes(answer.questionId)) {
            isCorrect = false;
        }
        if (selectedOption.questionId !== answer.questionId) {
            isCorrect = false;
        }

        const marksAwarded = isCorrect ? question.marks : 0;
        finalScore += marksAwarded;

        await prisma.attemptAnswer.update({
            where: {
                attemptId_questionId: {
                    attemptId,
                    questionId: answer.questionId,
                },
            },
            data: { isCorrect, marksAwarded },
        });
    }

    return finalScore;
}

// An exam's totalMarks must always equal the sum of the marks of the
// questions currently attached to it -- otherwise a student's score (sum of
// marksAwarded) can be compared against a stale number and show something
// like 240%. Call this any time a question is attached to or removed from
// an exam, so totalMarks never drifts out of sync.
export async function recalculateTotalMarks(examId: string): Promise<number> {
    const examQuestions = await prisma.examQuestion.findMany({
        where: { examId },
        include: { question: { select: { marks: true } } },
    });

    const totalMarks = examQuestions.reduce(
        (sum, examQuestion) => sum + examQuestion.question.marks,
        0
    );

    await prisma.exam.update({
        where: { id: examId },
        data: { totalMarks },
    });

    return totalMarks;
}
