import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/notifications/mark-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marks one notification (if notificationId is sent) or all of the user's notifications as read
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationId: { type: string }
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       401:
 *         description: Not logged in
 *       500:
 *         description: Server error
 */
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // If the body has a notificationId, mark only that one.
        // With no body, mark ALL of this user's notifications as read.
        let notificationId = "";
        try {
            const body = await req.json();
            notificationId = body.notificationId || "";
        } catch {
            // No JSON body sent -- that's fine, it means "mark all".
        }

        if (notificationId) {
            await prisma.notification.updateMany({
                where: {
                    id: notificationId,
                    userId: session.user.id, // so users can't touch someone else's notifications
                },
                data: {
                    isRead: true,
                },
            });
        } else {
            await prisma.notification.updateMany({
                where: {
                    userId: session.user.id,
                    isRead: false,
                },
                data: {
                    isRead: true,
                },
            });
        }

        return NextResponse.json(
            { message: "Notifications marked as read" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
