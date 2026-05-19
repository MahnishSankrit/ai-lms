import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as z from "zod";

const UpdateProfileSchema = z.object({
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
})

export async function PATCH(req: Request){
    try {
        const user = await getServerSession(authOptions);
        if(!user){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }

        const body = await req.json();
        const {email, password} = body;

        const validatedData = UpdateProfileSchema.parse({email, password});
        const updateData: any = {};

        if(validatedData.email){
            updateData.email = validatedData.email;
        }
        if(validatedData.password){
            const bcrypt = await import("bcryptjs");
            const hashedPassword = await bcrypt.hash(validatedData.password, 10);
            updateData.password = hashedPassword;
        }

        const userEmail = user.user.email;

        if (!userEmail) {
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            );
        }

        const updatedUser = await prisma.user.update({
            where: {
                email: userEmail,
            },
            data: updateData,
        })
        
        return NextResponse.json(
            {updatedUser ,password: undefined}, 
            {status: 200}
        );

    } catch (error) {
        console.error("Error in updating profile:", error);
        return NextResponse.json(
            {error: "Invalid input data"},
            {status: 400}
        )
    }
}