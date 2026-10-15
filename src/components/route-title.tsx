// Sets the browser-tab title for every page from ONE list, instead of a
// separate layout.tsx with `metadata` in each route folder.
//
// How it works: React 19 lets any component render a <title> tag and
// automatically moves it into <head>. We look at the current URL
// (usePathname), find the first matching entry below, and render
// "<Title> · AI LMS". It's rendered on the server too, so the title is
// correct on first load, not just after JavaScript runs.
//
// To add a page: add one line to ROUTE_TITLES. More specific patterns
// (e.g. /teacher/exams/new) must come before general ones (/teacher/exams/...).

"use client"

import { usePathname } from "next/navigation";

const ROUTE_TITLES: { pattern: RegExp; title: string }[] = [
    { pattern: /^\/$/, title: "" },
    { pattern: /^\/login$/, title: "Log in" },
    { pattern: /^\/register$/, title: "Register" },
    { pattern: /^\/forgot-password$/, title: "Forgot password" },
    { pattern: /^\/reset-password$/, title: "Reset password" },
    { pattern: /^\/verify-email$/, title: "Verify email" },
    { pattern: /^\/teacher-invite\/accept$/, title: "Accept invite" },
    { pattern: /^\/dashboard$/, title: "Dashboard" },
    { pattern: /^\/profile$/, title: "Profile" },
    { pattern: /^\/settings$/, title: "Settings" },
    { pattern: /^\/api\/docs$/, title: "API docs" },

    { pattern: /^\/admin$/, title: "Admin dashboard" },
    { pattern: /^\/admin\/users$/, title: "Users" },
    { pattern: /^\/admin\/logs$/, title: "Logs" },

    { pattern: /^\/student$/, title: "Dashboard" },
    { pattern: /^\/student\/attempts$/, title: "Attempt history" },
    { pattern: /^\/student\/classrooms$/, title: "My classrooms" },
    { pattern: /^\/student\/classrooms\/[^/]+$/, title: "Classroom" },
    { pattern: /^\/student\/exams$/, title: "Upcoming exams" },
    { pattern: /^\/student\/exams\/[^/]+\/results$/, title: "Exam result" },
    { pattern: /^\/student\/exams\/[^/]+$/, title: "Exam" },
    { pattern: /^\/student\/results$/, title: "My results" },

    { pattern: /^\/teacher$/, title: "Dashboard" },
    { pattern: /^\/teacher\/ai$/, title: "AI generator" },
    { pattern: /^\/teacher\/classrooms$/, title: "Classrooms" },
    { pattern: /^\/teacher\/classrooms\/[^/]+$/, title: "Classroom" },
    { pattern: /^\/teacher\/questions$/, title: "Question bank" },
    { pattern: /^\/teacher\/results$/, title: "Results" },
    { pattern: /^\/teacher\/exams$/, title: "Exams" },
    { pattern: /^\/teacher\/exams\/new$/, title: "New exam" },
    { pattern: /^\/teacher\/exams\/[^/]+\/edit$/, title: "Edit exam" },
    { pattern: /^\/teacher\/exams\/[^/]+\/results\/[^/]+$/, title: "Attempt review" },
    { pattern: /^\/teacher\/exams\/[^/]+\/results$/, title: "Exam results" },
];

export default function RouteTitle() {
    const pathname = usePathname();
    const match = ROUTE_TITLES.find((route) => route.pattern.test(pathname));

    // No match means the URL isn't a real page, so Next is showing the 404 page.
    if (!match) return <title>Page not found · AI LMS</title>;
    if (match.title === "") return <title>AI LMS</title>;
    return <title>{`${match.title} · AI LMS`}</title>;
}
