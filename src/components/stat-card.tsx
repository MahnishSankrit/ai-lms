// A clickable dashboard stat tile: a label, a big number, and an icon.
// The whole card is a link to the page that number is about.
// Has hover / pressed (active) / keyboard focus-ring states built in.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function StatCard({
    href,
    label,
    value,
    icon: Icon,
}: {
    href: string;
    label: string;
    value: string | number;
    icon: LucideIcon;
}) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
        >
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-bold">{value}</p>
            </div>
            <Icon className="size-8 text-primary/60" />
        </Link>
    );
}
