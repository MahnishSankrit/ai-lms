import { NextResponse }from "next/server";
import { getServerSession }from "next-auth";
import { authOptions }from "@/lib/auth";
import { prisma }from "@/lib/prisma";
import { completeExpiredExams } from "@/lib/exam-status";
import { seededShuffle } from "@/lib/shuffle";

/**
 * @swagger
 * /api/exams/{id}:
 *   get:
 *     tags: [Exams]
 *     summary: Get a single exam (full data for owning teacher, sanitized for member student)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Exam detail (shape differs by role). For a student, questions is empty until they have an in-progress attempt (started via /api/attempts/start, which checks the access code)."
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Teacher who doesn't own it; or student when exam isn't published or not a classroom member
 *       404:
 *         description: Exam not found
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    try {

        const session =
            await getServerSession(authOptions);

        // close exams whose end time has passed, so the status shown is current
        await completeExpiredExams();

        if (!session) {

            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        const examId =
            (await params).id;

        const exam =
            await prisma.exam.findUnique({

                where: {
                    id: examId,
                },

                include: {

                    classroom: {

                        select: {
                            id: true,
                            name: true,
                        },
                    },

                    questions: {
                        include: {
                            question: {
                                include: {
                                    options: true,
                                },
                            },
                        },
                    },

                    createdBy: {

                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

        if (!exam) {

            return NextResponse.json(
                {
                    error:
                        "Exam not found",
                },
                {
                    status: 404,
                }
            );
        }

        // TEACHER ACCESS
        if (
            session.user.role === "teacher"
        ) {

            if (
                exam.createdById !==
                session.user.id
            ) {

                return NextResponse.json(
                    {
                        error: "Forbidden",
                    },
                    {
                        status: 403,
                    }
                );
            }

            return NextResponse.json(
                {
                    exam,
                },
                {
                    status: 200,
                }
            );
        }

        // STUDENT ACCESS
        if (
            session.user.role === "student"
        ) {

            // Students can view it once it's live -- either still
            // "published" (teacher hasn't clicked Start yet) or "ongoing"
            // (they have). Only "draft" and "completed" are off-limits.
            if (
                exam.status !== "published" &&
                exam.status !== "ongoing"
            ) {

                return NextResponse.json(
                    {
                        error:
                            "Exam not available",
                    },
                    {
                        status: 403,
                    }
                );
            }

            // MEMBERSHIP CHECK
            const membership =
                await prisma.classroomMember.findFirst({

                    where: {
                        classroomId:
                            exam.classroomId,

                        userId:
                            session.user.id,
                    },
                });

            if (!membership) {

                return NextResponse.json(
                    {
                        error: "Forbidden",
                    },
                    {
                        status: 403,
                    }
                );
            }

            // ACCESS-CODE GATE
            // Questions are only sent once the student has an in-progress
            // attempt. The only way to get one is /api/attempts/start, which
            // checks the access code on the server -- so calling this API
            // directly can't skip the code anymore.
            const activeAttempt =
                await prisma.examAttempt.findFirst({
                    where: {
                        examId: exam.id,
                        studentId: session.user.id,
                        status: "in_progress",
                    },
                });

            // SANITIZE QUESTIONS
            let sanitizedQuestions = !activeAttempt ? [] :
                exam.questions.map(question => {

                    // Strip isCorrect -- students should never receive
                    // which option is correct before they've answered.
                    const options = question.question.options.map(option => ({
                        id: option.id,
                        optionText: option.optionText,
                    }));

                    return {

                        // This must be the actual Question's id (not the
                        // ExamQuestion join row's id) -- attempts/save and the
                        // AttemptAnswer.questionId foreign key both expect it.
                        id: question.question.id,

                        question:
                            question.question.questionText,

                        type:
                            question.question.type,

                        options: exam.shuffleOptions
                            ? seededShuffle(options, `${session.user.id}-${question.question.id}-options`)
                            : options,

                        marks:
                            question.question.marks,
                    };
                });

            // Same idea, but for the order questions appear in -- each
            // student gets a consistent-for-them but different order from
            // other students, so "Q3 is B" isn't useful info to share.
            if (exam.shuffleQuestions) {
                sanitizedQuestions = seededShuffle(sanitizedQuestions, `${session.user.id}-${exam.id}-questions`);
            }

            return NextResponse.json(
                {
                    exam: {

                        id: exam.id,

                        title:
                            exam.title,

                        description:
                            exam.description,

                        duration:
                            exam.durationMinutes,

                        // Never send the actual code -- the teacher shares
                        // it separately. Students only need to know
                        // whether one is required at all.
                        requiresAccessCode:
                            Boolean(exam.accessCode),

                        fullscreenRequired:
                            exam.fullscreenRequired,

                        startTime:
                            exam.startsAt,

                        endTime:
                            exam.endsAt,

                        classroom:
                            exam.classroom,

                        questionsCount:
                            exam.questions.length,

                        questions:
                            sanitizedQuestions,
                    },
                },
                {
                    status: 200,
                }
            );
        }

        return NextResponse.json(
            {error: "Forbidden",},
            {status: 403,}
        );

    } catch (error) {
        console.error("Error fetching exam:",error);

        return NextResponse.json(
            {error:"Failed to fetch exam",},
            {status: 500,}
        );
    }
}