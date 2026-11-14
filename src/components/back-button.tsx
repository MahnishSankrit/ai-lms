// Generic "Back" button used on every dashboard page.
// It is rendered once in DashboardNav (so every page gets it), but it can
// also be dropped into any page on its own: <BackButton /> or
// <BackButton fallbackHref="/teacher/exams" label="Back to exams" />.
//
// How it decides where to go:
// - If the user came from another page in this tab, go back in history.
// - Otherwise (opened the link directly / new tab), go to fallbackHref,
//   or, if none is given, one level up in the URL
//   (e.g. /teacher/exams/123/edit -> /teacher/exams/123).

"use client"

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

function getParentPath(pathname: string) {
    const parts = pathname.split("/").filter((part) => part !== "");
    parts.pop();

    if (parts.length === 0) {
        return "/dashboard";
    }

    return "/" + parts.join("/");
}

export default function BackButton({
    fallbackHref,
    label = "Back",
}: {
    fallbackHref?: string;
    label?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = () => {
        if (window.history.length > 1) {
            router.back();
        } else if (fallbackHref) {
            router.push(fallbackHref);
        } else {
            router.push(getParentPath(pathname));
        }
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleClick} className="-ml-2 mb-4">
            <ArrowLeft />
            {label}
        </Button>
    );
}
