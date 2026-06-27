// this is for the stiudents dashboard to get the results of the students
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (session.user.role !== "student") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }


        const studentId = session.user.id;
        // const attempts = await prisma.examAttempt.findMany({
        //     where: {
        //         studentId: studentId,
        //         status: "submitted"
        //     },
        //     include: {
        //         exam: true,
        //         answers: {
        //             include: {
        //                 question: true
        //             }
        //         },
        //         violations: true
        //     }
        // })

        const { searchParams } = new URL(req.url);

        const page = Number(
            searchParams.get("page") || "1"
        );

        const limit = Number(
            searchParams.get("limit") || "10"
        );

        const skip =
            (page - 1) * limit;


        const attempts =
            await prisma.examAttempt.findMany({

                where: {
                    studentId,
                    status: "submitted"
                },

                skip,

                take: limit,

                orderBy: {
                    submittedAt: "desc"
                },

                include: {
                    exam: true,
                    violations: true
                }

            });

        if (!attempts || attempts.length === 0) {
            return NextResponse.json(
                { error: "No results found" },
                { status: 404 }
            );
        }

        const totalAttempts = await prisma.examAttempt.count({
            where: {
                studentId,
                status: "submitted",
            },
        });
        const results = {
            attempts: attempts.map(attempt => ({
                id: attempt.id,
                examId: attempt.examId,
                examTitle: attempt.exam.title,
                score: attempt.score,
                totalMarks: attempt.exam.totalMarks,
                status: attempt.status,
                percentage:
                    attempt.exam.totalMarks > 0
                        ?
                        (attempt.score ?? 0)
                        /
                        attempt.exam.totalMarks
                        *
                        100
                        :
                        0,
                pass: attempt.exam.passingMarks ? attempt.score! >= attempt.exam.passingMarks : true,
                violations: attempt.violations
            }))
        }

        return NextResponse.json(
            {
                totalAttempts,
                page,
                skip,
                limit,
                totalPages: Math.ceil(totalAttempts / limit),
                results },
            { status: 200 }
        );



    } catch (error) {
        console.error("Error fetching student results:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

