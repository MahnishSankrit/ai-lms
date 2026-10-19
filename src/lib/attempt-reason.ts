// Works out WHY an attempt was auto-submitted, so we can show it to the student.
// The database only stores status "auto_submitted", not the reason, so we guess it:
// - the attempt has violations       -> proctoring violation
// - the full exam time was used up   -> time ran out
// - otherwise                        -> the teacher ended the exam early

type AttemptForReason = {
    status: string;
    startedAt: Date;
    submittedAt: Date | null;
    violations: { type: string }[];
    exam: { durationMinutes: number };
};

function violationLabel(type: string) {
    if (type === "tab_switch") return "tab switching";
    if (type === "fullscreen_exit") return "leaving fullscreen";
    if (type === "copy_paste") return "copy/paste";
    if (type === "right_click") return "right-clicking";
    if (type === "window_blur") return "leaving the exam window";
    return "breaking an exam rule";
}

export function getAutoSubmitReason(attempt: AttemptForReason) {
    // Normal submits don't need a reason.
    if (attempt.status !== "auto_submitted") {
        return null;
    }

    // 1. Proctoring violation. The last violation is the one that ended the exam.
    if (attempt.violations.length > 0) {
        const lastViolation = attempt.violations[attempt.violations.length - 1];
        return "Proctoring violation: " + violationLabel(lastViolation.type);
    }

    // 2. Time ran out.
    if (attempt.submittedAt) {
        const millisecondsUsed = attempt.submittedAt.getTime() - attempt.startedAt.getTime();
        const minutesUsed = millisecondsUsed / 60000;

        if (minutesUsed >= attempt.exam.durationMinutes) {
            return "Time ran out";
        }
    }

    // 3. Anything else means the teacher ended the exam early.
    return "The teacher ended the exam before you submitted";
}
