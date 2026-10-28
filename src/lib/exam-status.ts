import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/grading";

// Exams only became "completed" when the teacher clicked End, so an exam
// whose endsAt had passed still showed "Published" / "Ongoing" forever.
// Call this before reading exams: it does the same thing as the End
// button for every exam whose end time is already over -- auto-submits
// in-progress attempts (graded) and marks the exam completed.
//
// Lazy (on read) instead of a cron job, so it needs no extra infrastructure.
export async function completeExpiredExams() {
    const expiredExams = await prisma.exam.findMany({
        where: {
            status: { in: ["published", "ongoing"] },
            endsAt: { lt: new Date() },
        },
        include: {
            attempts: {
                where: { status: "in_progress" },
                select: { id: true },
            },
        },
    });

    for (const exam of expiredExams) {
        for (const attempt of exam.attempts) {
            const finalScore = await gradeAttempt(attempt.id);
            await prisma.examAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: "auto_submitted",
                    score: finalScore,
                    submittedAt: new Date(),
                },
            });
        }

        await prisma.exam.update({
            where: { id: exam.id },
            data: { status: "completed" },
        });
    }
}
