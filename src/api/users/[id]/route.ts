import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request,{ params }: { params: { id: string } }) {
    try {

        const id = params.id;

        const user = await prisma.user.findUnique({
            where: {
                id: id,
            },

            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
        })
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            { user },
            { status: 200 }
        )
    } catch (error) {
        console.error("Error in fetching user details:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}