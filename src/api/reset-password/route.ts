import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


export async function POST(req: Request){
    try {
        const {currToken , newPassword} = await req.json();
        if(!currToken || !newPassword){
            return NextResponse.json(
                {error: "Missing token or new password"},
                {status: 400}
            )
        }

        // Look up the token in the PasswordResetToken table (schema has a separate model)
        const tokenRecord = await prisma.passwordResetToken.findFirst({
            where: {
                token: currToken,
                expiresAt: {
                    gt: new Date(), // token not expired
                }
            }
        })

        if (!tokenRecord) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({ where: { email: tokenRecord.email } })

        if (!user) {
            return NextResponse.json(
                { error: "User not found for token" },
                { status: 400 }
            )
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: newPasswordHash }
        })

        // remove the used token
        await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } })



        return NextResponse.json(
            {message: "Password reset successful"},
            {status: 200}
        )   
    } catch (error) {
        console.error("Error in reset password:", error);
        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        )
    }
}