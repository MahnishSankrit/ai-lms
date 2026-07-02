import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuestionSchema } from "@/validation/question.schema";
import { ZodError } from "zod";
import { Parser } from "json2csv";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }
        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const teacher = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            }
        })
        if (!teacher) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        const question = await prisma.question.findMany({
            where: {
                createdById: teacher.id,
            },
            include: {
                options: true,
            }
        })
        if(!question || question.length === 0){
            return NextResponse.json(
                {error: "No questions found for this teacher"},
                {status: 404}
            )
        }

        // this is transforming the question data into a format that can be exported to excel
        const rows =
            question.map(q => ({
                questionText: q.questionText,
                type: q.type,
                marks: q.marks,
                difficulty: q.difficulty
            }));


            const csv = new Parser().parse(rows);

            return new Response(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename=questions.csv'
                }
            });

    } catch (error) {
        console.error("Error exporting questions:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}


