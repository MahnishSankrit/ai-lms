// Generic "page is loading" placeholder: a heading bar and a few content
// blocks. Used instead of plain "Loading..." text so pages don't jump
// around when the real content arrives.

import { Skeleton } from "@/components/ui/skeleton";

export default function PageSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
        </div>
    );
}
