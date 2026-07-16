import { NextResponse }from "next/server";
import { getServerSession }from "next-auth";
import { authOptions }from "@/lib/auth";
import { prisma }from "@/lib/prisma";

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
 *         description: Exam detail (shape differs by role)
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

            // ONLY PUBLISHED EXAMS
            if (
                exam.status !==
                "published"
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

            // SANITIZE QUESTIONS
            const sanitizedQuestions =
                exam.questions.map(question => ({

                    id: question.id,

                    question:
                        question.question.questionText,

                    options:
                        question.question.options,

                    marks:
                        question.question.marks,
                }));

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