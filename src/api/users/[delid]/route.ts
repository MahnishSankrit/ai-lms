
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server"; 


export async function DELETE(req: Request, { params }: { params: { delid: string } }) {
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

        const id = params.delid;
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

        // here we are doing the hard delete of the user, in real world applications, we should do the soft delete by adding a isDeleted field in the database and setting it to true instead of actually deleting the user from the database, this is because we might need to keep the user data for future reference or for auditing purposes
        // soft delete may be in the future
        
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
        
    }
}
