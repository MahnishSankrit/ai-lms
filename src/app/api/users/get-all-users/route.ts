import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";


export async function GET(req: Request) {
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

        // pagination --> this is for the fetching the users in a paginated way, we will fetch 10 users at a time
        // prisma uses skip and take for pagination, skip is the number of records to skip and take is the number of records to fetch
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;
        
        const users = await prisma.user.findMany({
            skip: skip,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                email: true,   
                role: true,
                isVerified: true,
                createdAt: true,
            }
        });

        const totalUsers = await prisma.user.count();
        const totalPages = Math.ceil(totalUsers / limit);

        return NextResponse.json(
            {
                users,
                pagination: {
                    page,
                    limit,
                    totalUsers,
                    totalPages,
                    currentPage: page,
                }
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in fetching users:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}


