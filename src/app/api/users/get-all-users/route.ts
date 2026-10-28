import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";


/**
 * @swagger
 * /api/users/get-all-users:
 *   get:
 *     tags: [Users]
 *     summary: Admin -- paginated list of all users
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated users list
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not an admin
 *       500:
 *         description: Server error
 */
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
                status: true, // so the admin page can show the current status
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


