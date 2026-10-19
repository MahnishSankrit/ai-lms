// Shows a date as "3 weeks ago". Hovering shows the full Indian date and
// time (DD/MM/YYYY). Uses the HTML <time> tag, which is made for dates.

import { formatIndianDateTime, timeAgo } from "@/lib/format-date";

export default function RelativeDate({ date }: { date: string | Date }) {
    return (
        // suppressHydrationWarning: the server and browser render a few
        // seconds apart, so "just now" vs "1 minute ago" can differ. That's fine.
        <time dateTime={new Date(date).toISOString()} title={formatIndianDateTime(date)} suppressHydrationWarning>
            {timeAgo(date)}
        </time>
    );
}
