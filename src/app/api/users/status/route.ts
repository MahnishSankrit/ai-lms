import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";

const updateStatusSchema = z.object({
  userId: z.string(),
  status: z.enum([
    "active",
    "inactive",
    "suspended",
  ]),
});

export async function PATCH(req: Request) {
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
        const body = await req.json();
        const { id, status } = body;
        const validatedData = updateStatusSchema.parse({ userId: id, status });
        if (!validatedData.userId || !validatedData.status) {
            return NextResponse.json(
                { error: "Missing user ID or status" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                id: validatedData.userId,
            },
        });
        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }
        
        // update the user status in the database
        const updatedUser = await prisma.user.update({
            where: {
                id: validatedData.userId,
            },
            data: {
                status: validatedData.status,
            },
            select: {
                id: true,
                email: true,
                role: true, 
                status: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        return NextResponse.json(
            { message: "User status updated successfully", user: updatedUser },
            { status: 200 }
        );


    } catch (error) {
        console.error("Error in updating user status:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
