import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";



export async function GET(req: Request) {
    try {
        const sessionUser = await getServerSession(authOptions); // this will return the session of the currently logged in user, if there is no user logged in, it will return null
        if(!sessionUser){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }

        // this is the email of the currently logged in user, we can use this email to fetch the user details from the database
        const email = sessionUser.user?.email;
        if (!email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email,
            },
            select: {
              id: true,
              email: true,
              role: true,
              isVerified: true,
              createdAt: true,
              updatedAt: true,  
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