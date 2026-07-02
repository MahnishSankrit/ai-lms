import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    try {

        // AUTHENTICATION
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

        // RBAC
        if (
            session.user.role !== "teacher"
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

        const teacherId = session.user.id;

        if (!teacherId) {
            return NextResponse.json(
                {
                    error: "User ID missing from session",
                },
                {
                    status: 400,
                }
            );
        }

        const examId =
            (await params).id;

        // FETCH ORIGINAL EXAM
        const exam =
            await prisma.exam.findUnique({

                where: {
                    id: examId,
                },

                include: {

                    // THIS IS ExamQuestion[]
                    questions: true,
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

        // OWNERSHIP CHECK
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

        // TRANSACTIONAL DUPLICATION
        const duplicatedExam =
            await prisma.$transaction(

                async (tx) => {

                    const newExam =
                        await tx.exam.create({

                            data: {

                                title:
                                    exam.title +
                                    " (Copy)",

                                description:
                                    exam.description,

                                instructions:
                                    exam.instructions,

                                classroomId:
                                    exam.classroomId,

                                createdById:
                                    teacherId,

                                durationMinutes:
                                    exam.durationMinutes,

                                totalMarks:
                                    exam.totalMarks,

                                passingMarks:
                                    exam.passingMarks,

                                negativeMarking:
                                    exam.negativeMarking,

                                shuffleQuestions:
                                    exam.shuffleQuestions,

                                shuffleOptions:
                                    exam.shuffleOptions,

                                fullscreenRequired:
                                    exam.fullscreenRequired,

                                maxTabSwitches:
                                    exam.maxTabSwitches,

                                startsAt:
                                    exam.startsAt,

                                endsAt:
                                    exam.endsAt,

                                // IMPORTANT
                                // DUPLICATED EXAM
                                // ALWAYS STARTS AS DRAFT
                                status: "draft",

                                // DUPLICATE
                                // ExamQuestion RELATIONS
                                questions: {

                                    create:
                                        exam.questions.map(
                                            (question) => ({

                                                questionId:
                                                    question.questionId,

                                                order:
                                                    question.order,
                                            })
                                        ),
                                },
                            },

                            include: {
                                questions: true,
                            },
                        });

                    return newExam;
                }
            );

        return NextResponse.json(
            {
                message:
                    "Exam duplicated successfully",

                exam:
                    duplicatedExam,
            },
            {
                status: 201,
            }
        );

    } catch (error) {

        console.error(
            "Error duplicating exam:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Failed to duplicate exam",
            },
            {
                status: 500,
            }
        );
    }
}