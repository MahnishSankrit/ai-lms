import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {

    const { searchParams } = new URL(req.url);

    const token = searchParams.get("token");

    if (!token) {
        return Response.json(
            {
                error: "Invalid token",
            },
            { status: 400 }
        );
    }

    const user = await prisma.user.findFirst({
        where: {
            verificationToken: token,
        },
    });

    if (!user) {
        return Response.json(
            {
                error: "Invalid token",
            },
            { status: 400 }
        );
    }

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            isVerified: true,
            verificationToken: null,
        },
    });

    return Response.json({
        success: true,
    });
}