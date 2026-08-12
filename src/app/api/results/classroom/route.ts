// this is for the teacher analytics 

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import { Average } from "next/font/google";



/**
 * @swagger
 * /api/results/classroom:
 *   get:
 *     tags: [Results]
 *     summary: Teacher-wide analytics across all of the teacher's classrooms
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Aggregate results (totalAttempts, averageScore, passRate, per-classroom summary)
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher
 *       404:
 *         description: Teacher has no classrooms
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const teacherId = session.user.id;
        if (!teacherId) {
            return NextResponse.json(
                { error: "Teacher ID not found" },
                { status: 404 }
            );
        }
        const classrooms = await prisma.classroom.findMany({
            where: {
                ownerId: teacherId,
            },
            include: {
                exams: {
                    include: {
                        attempts: {
                            where: {
                                status: "submitted",
                            },
                            include: {
                                student: {
                                    include: {
                                        profile: true,
                                    },
                                },
                            },
                        },
                    },
                },
                members: true,
            },
        });

        if (!classrooms.length) {
            return NextResponse.json(
                { error: "Classroom not found" },
                { status: 404 }
            );
        }


        // create the statistics
        let totalScores = 0;
        let totalAttempts = 0;
        // let totalExams = 0;
        let highestScore = -Infinity;
        let lowestScore = Infinity;
        let passedStudents = 0;


        // loop through the classrooms and exams to calculate the statistics
        for (const classroom of classrooms) {
            for (const exam of classroom.exams) {
                // totalExams++;
                for (const attempt of exam.attempts) {
                    totalAttempts++;
                    const score = attempt.score ?? 0;
                    totalScores += score;

                    if (score > highestScore) {
                        highestScore = score;
                    }
                    if (score < lowestScore) {
                        lowestScore = score;
                    }

                    if (
                        typeof exam.passingMarks === "number" &&
                        score >= exam.passingMarks
                    ) {
                        passedStudents++;
                    }
                }
            }
        }

        const averageScore = totalAttempts > 0 ? totalScores / totalAttempts : 0;
        const passRate = totalAttempts > 0 ? (passedStudents / totalAttempts) * 100 : 0;
        if (highestScore === -Infinity) highestScore = 0;
        if (lowestScore === Infinity) lowestScore = 0;

        const results = {

    totalClassrooms:
        classrooms.length,

    totalAttempts,

    averageScore:
        Number(
            averageScore.toFixed(2)
        ),

    highestScore,

    lowestScore:
        lowestScore === Infinity
            ? 0
            : lowestScore,

    passRate:
        Number(
            passRate.toFixed(2)
        ),

    classrooms:
        classrooms.map((classroom) => {

            // Same aggregation as above, but scoped to just this classroom's
            // exams/attempts, so each classroom gets its own average/pass rate
            // instead of only the teacher-wide numbers.
            let classroomTotalScore = 0;
            let classroomTotalAttempts = 0;
            let classroomPassed = 0;
            let classroomHighest = -Infinity;
            let classroomLowest = Infinity;

            for (const exam of classroom.exams) {
                for (const attempt of exam.attempts) {
                    classroomTotalAttempts++;
                    const score = attempt.score ?? 0;
                    classroomTotalScore += score;

                    if (score > classroomHighest) classroomHighest = score;
                    if (score < classroomLowest) classroomLowest = score;

                    if (
                        typeof exam.passingMarks === "number" &&
                        score >= exam.passingMarks
                    ) {
                        classroomPassed++;
                    }
                }
            }

            const classroomAverageScore =
                classroomTotalAttempts > 0 ? classroomTotalScore / classroomTotalAttempts : 0;
            const classroomPassRate =
                classroomTotalAttempts > 0 ? (classroomPassed / classroomTotalAttempts) * 100 : 0;

            return {

                classroomId:
                    classroom.id,

                classroomName:
                    classroom.name,

                subject:
                    classroom.subject,

                joinCode:
                    classroom.joinCode,

                totalStudents:
                    classroom.members.length,

                totalExams:
                    classroom.exams.length,

                totalAttempts:
                    classroomTotalAttempts,

                averageScore:
                    Number(classroomAverageScore.toFixed(2)),

                highestScore:
                    classroomHighest === -Infinity ? 0 : classroomHighest,

                lowestScore:
                    classroomLowest === Infinity ? 0 : classroomLowest,

                passRate:
                    Number(classroomPassRate.toFixed(2)),

            };
        })
};
        return NextResponse.json(
            { results },
            { status: 200 }
        );





    } catch (error) {
        console.error("Error fetching classroom results:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}



