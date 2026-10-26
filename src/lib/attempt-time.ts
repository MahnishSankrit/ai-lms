// Works out when an attempt must end, on the SERVER (never trust the
// browser's timer -- a student can pause or delete it in DevTools).
//
// Deadline = whichever comes first:
//   - startedAt + exam duration
//   - the exam's endsAt (a student who starts 1 minute before the exam
//     closes only gets 1 minute, not the full duration)
//
// GRACE_SECONDS gives a little slack for network delay, so an answer
// clicked in the last second isn't rejected just because the request
// arrived slightly late.

export const GRACE_SECONDS = 30;

export function getAttemptDeadline(
    startedAt: Date,
    exam: { durationMinutes: number; endsAt: Date | null }
): Date {
    const durationEnd = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);

    if (exam.endsAt && exam.endsAt < durationEnd) {
        return exam.endsAt;
    }
    return durationEnd;
}

// Seconds left until the deadline (0 if it has passed)
export function getRemainingSeconds(
    startedAt: Date,
    exam: { durationMinutes: number; endsAt: Date | null }
): number {
    const deadline = getAttemptDeadline(startedAt, exam);
    const remaining = Math.floor((deadline.getTime() - Date.now()) / 1000);
    if (remaining < 0) {
        return 0;
    }
    return remaining;
}

// True once the deadline + grace period has passed
export function isAttemptExpired(
    startedAt: Date,
    exam: { durationMinutes: number; endsAt: Date | null }
): boolean {
    const deadline = getAttemptDeadline(startedAt, exam);
    return Date.now() > deadline.getTime() + GRACE_SECONDS * 1000;
}
