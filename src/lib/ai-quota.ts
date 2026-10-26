// daily ai quota limit for teachers



// Each teacher can generate questions DAILY_AI_LIMIT times per day.
// We keep one AiUsage row per teacher per day (userId + date).
// A new day means a new date, so a new row: the quota resets automatically.


import { prisma } from "@/lib/prisma";

export const DAILY_AI_LIMIT = 3;


export function getToday(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
}


// Tries to use one request from today's quota.
// Returns true if allowed, false if the limit is already reached.
export async function consumeAiQuota(userId: string): Promise<boolean> {
    const today = getToday();

    // step 1: make sure today's row exists (count starts at 0)
    await prisma.aiUsage.upsert({
        where: { userId_date: { userId: userId, date: today } },
        create: { userId: userId, date: today, count: 0 },
        update: {},
    });

    // step 2: add 1 ONLY if count is still below the limit.
    // It's a single query, so two requests at the same time can't both pass.
    const result = await prisma.aiUsage.updateMany({
        where: {
            userId: userId,
            date: today,
            count: { lt: DAILY_AI_LIMIT },
        },
        data: { count: { increment: 1 } },
    });

    // result.count = how many rows were updated (0 means the limit was reached)
    if (result.count === 0) {
        return false;
    }

    return true;
}



// Gives one request back (used when the Gemini call fails)
export async function refundAiQuota(userId: string): Promise<void> {
    await prisma.aiUsage.updateMany({
        where: {
            userId: userId,
            date: getToday(),
            count: { gt: 0 },   // never go below 0
        },
        data: { count: { decrement: 1 } },
    });
}

// How many requests the teacher has left today
export async function getRemainingAiQuota(userId: string): Promise<number> {
    const usage = await prisma.aiUsage.findUnique({
        where: { userId_date: { userId: userId, date: getToday() } },
    });

    // no row yet = nothing used today
    if (!usage) {
        return DAILY_AI_LIMIT;
    }

    const remaining = DAILY_AI_LIMIT - usage.count;
    if (remaining < 0) {
        return 0;
    }
    return remaining;
}

// Admin: reset a teacher's quota for today
export async function resetAiQuota(userId: string): Promise<void> {
    await prisma.aiUsage.updateMany({
        where: { userId: userId, date: getToday() },
        data: { count: 0 },
    });
}
