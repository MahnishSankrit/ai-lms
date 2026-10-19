import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";



/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Returns the currently logged-in user's own profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not logged in
 *       404:
 *         description: User no longer exists in DB
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
    try {
        const sessionUser = await getServerSession(authOptions); // this will return the session of the currently logged in user, if there is no user logged in, it will return null
        if(!sessionUser){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }
        // Look the user up by id, not email: the email can be changed on the
        // profile page, but the session keeps the old one until the next
        // login -- so an email lookup would return "User not found".
        const userId = sessionUser.user?.id;
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
              id: true,
              email: true,
              role: true,
              isVerified: true,
              createdAt: true,
              updatedAt: true,
              // Personal details saved at sign-up (null for older accounts)
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  username: true,
                  studentId: true,
                  phone: true,
                },
              },
            }
        })
        if(!user){
            return NextResponse.json(
                {error: "User not found"},
                {status: 404}
            )
        }

        return NextResponse.json(
            {user},
            {status: 200}
        )
    } catch (error) {
        console.error("Error in fetching user details:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}