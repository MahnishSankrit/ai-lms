

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// import { createExamSchema } from "@/validation/exam.schema";



export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        if (session.user.role === "teacher") {
            const exams = await prisma.exam.findMany({
                where: {
                    createdById: session.user.id,
                },
                include: {
                    createdById: {
                        select: {
                            id: true,
                            email: true,
                        }
                    },

                    classroom: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
                orderBy: {
                    createdAt: "desc",
                }
            })

            return NextResponse.json(
                { exams },
                { status: 200 }
            )
        }
        if (session.user.role === "student") {
            const exams = await prisma.exam.findMany({
                where: {
                    status: "published",
                    classroom: {
                        members: {
                            some: {
                                userId: session.user.id,
                            }
                        }
                    }
                },
                include: {
                    createdById: {
                        select: {
                            id: true,
                            email: true,
                        }
                    },
                    classroom: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
                orderBy: {
                    createdAt: "desc",
                }
            })

            return NextResponse.json(
                { exams },
                { status: 200 }
            )
        }

        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        )

    } catch (error) {
        console.error("Error in fetching exams:", error);
        return NextResponse.json(
            { error: "Failed to fetch exams" },
            { status: 500 }
        )
    }
}