// Custom 404 page. Next.js shows this for any URL that doesn't match a
// route (and whenever a page calls notFound()). "Back to dashboard" goes
// to /dashboard, which already redirects each role to its own home page
// (or to /login if nobody is signed in).

import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background p-6 text-center">
            <FileQuestion className="size-12 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">404</p>
            <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
                The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            </p>
            <Button nativeButton={false} render={<Link href="/dashboard" />}>
                Back to dashboard
            </Button>
        </main>
    );
}
