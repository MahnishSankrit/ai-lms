// Small date helpers used across the app.
// - formatIndianDate: 05/03/2026  (DD/MM/YYYY)
// - timeAgo:          "3 weeks ago", "in 2 days", "just now"
// Pages show timeAgo() as text and formatIndianDate() on hover.

export function formatIndianDate(date: string | Date) {
    // "en-IN" is the Indian locale, which writes dates as DD/MM/YYYY.
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function formatIndianDateTime(date: string | Date) {
    return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Turns a number + unit into "3 weeks ago" or "in 3 weeks".
function phrase(amount: number, unit: string, inFuture: boolean) {
    let text = amount + " " + unit;
    if (amount !== 1) {
        text = text + "s"; // 1 day, 2 days
    }
    if (inFuture) {
        return "in " + text;
    }
    return text + " ago";
}

export function timeAgo(date: string | Date) {
    const secondsDiff = (Date.now() - new Date(date).getTime()) / 1000;
    const inFuture = secondsDiff < 0;
    const seconds = Math.abs(secondsDiff);

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return "just now";
    if (minutes < 60) return phrase(minutes, "minute", inFuture);
    if (hours < 24) return phrase(hours, "hour", inFuture);
    if (days < 7) return phrase(days, "day", inFuture);
    if (weeks < 5) return phrase(weeks, "week", inFuture);
    if (months < 12) return phrase(months, "month", inFuture);
    return phrase(years, "year", inFuture);
}
