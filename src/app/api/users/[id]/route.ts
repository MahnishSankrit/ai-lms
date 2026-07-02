import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request,{ params }: { params: Promise<{ id: string }> }) {
    try {

        const { id } = await params;

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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession(authOptions);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        if(user.user.role !== "admin"){
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const existingUser = await prisma.user.findUnique({
            where: {
                id: id,
            },
        });
        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }
        if(user.user.id === id){
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            );
        }

        await prisma.user.delete({
            where: {
                id: id,
            },
        });

        return NextResponse.json(
            { message: "User deleted successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error in deleting user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
