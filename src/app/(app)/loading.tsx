// Shown instantly by Next.js while any page under (app) is loading, so
// clicking a link never leaves the screen blank.

import PageSkeleton from "@/components/page-skeleton";

export default function Loading() {
    return <PageSkeleton />;
}
