// Lists every exam the student has finished, with score and pass/fail.
//
// Like Attempt History, we load ALL results once and then filter, sort
// and paginate them here in the browser -- simple, and a student only
// has a few dozen results.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";
import RelativeDate from "@/components/relative-date";
import SimplePagination from "@/components/simple-pagination";

const PAGE_SIZE = 10;

type ResultSummary = {
    id: string; // this is the attemptId
    examId: string;
    examTitle: string;
    classroomId: string;
    classroomName: string;
    submittedAt: string | null;
    score: number | null;
    totalMarks: number;
    percentage: number;
    pass: boolean;
    autoSubmitReason: string | null; // set only for auto-submitted attempts
};

// true if the date is within the last `days` days.
function isWithinDays(date: string | null, days: number) {
    if (!date) return false;
    const millisecondsAgo = Date.now() - new Date(date).getTime();
    return millisecondsAgo <= days * 24 * 60 * 60 * 1000;
}

// Used for sorting by date. Missing dates count as very old.
function timeOf(date: string | null) {
    if (!date) return 0;
    return new Date(date).getTime();
}

export default function StudentResultsPage() {
    const [results, setResults] = useState<ResultSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters, sort and page
    const [classroomFilter, setClassroomFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all"); // "all" or a number of days
    const [sortBy, setSortBy] = useState("newest");
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetch("/api/results/students?limit=500")
            .then(async (response) => {
                const data = await response.json();

                // The API returns 404 when the student has no results yet.
                // That's a normal empty state here, not an error.
                if (response.status === 404) {
                    setResults([]);
                    return;
                }

                if (!response.ok) {
                    setError(data.error || "Failed to load results");
                    return;
                }

                setResults(data.results.attempts);
            })
            .catch((err) => {
                console.error("Error loading results:", err);
                setError("Something went wrong. Please try again.");
            })
            .finally(() => setLoading(false));
    }, []);

    // List of classrooms for the dropdown (each one only once).
    const classrooms: { id: string; name: string }[] = [];
    for (const result of results) {
        const alreadyAdded = classrooms.some((c) => c.id === result.classroomId);
        if (!alreadyAdded) {
            classrooms.push({ id: result.classroomId, name: result.classroomName });
        }
    }

    // Step 1: filter
    const filtered = results.filter((result) => {
        if (classroomFilter !== "all" && result.classroomId !== classroomFilter) return false;
        if (statusFilter === "pass" && !result.pass) return false;
        if (statusFilter === "fail" && result.pass) return false;
        if (statusFilter === "auto" && !result.autoSubmitReason) return false;
        if (dateFilter !== "all" && !isWithinDays(result.submittedAt, Number(dateFilter))) return false;
        return true;
    });

    // Step 2: sort (copy first with [...] so we don't change the original list)
    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === "oldest") return timeOf(a.submittedAt) - timeOf(b.submittedAt);
        if (sortBy === "score-high") return b.percentage - a.percentage;
        if (sortBy === "score-low") return a.percentage - b.percentage;
        return timeOf(b.submittedAt) - timeOf(a.submittedAt); // "newest" (default)
    });

    // Step 3: paginate -- page 1 shows items 0-9, page 2 shows 10-19, ...
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // When a filter changes, go back to page 1.
    const changeFilter = (setter: (value: string) => void, value: string | null) => {
        setter(value ?? "all");
        setPage(1);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">My Results</h1>

            {/* Filters + sort */}
            <div className="mt-6 flex flex-wrap gap-3">
                <Select value={classroomFilter} onValueChange={(value) => changeFilter(setClassroomFilter, value)}>
                    <SelectTrigger className="w-48" aria-label="Filter by classroom">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All classrooms</SelectItem>
                        {classrooms.map((classroom) => (
                            <SelectItem key={classroom.id} value={classroom.id}>
                                {classroom.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value) => changeFilter(setStatusFilter, value)}>
                    <SelectTrigger className="w-44" aria-label="Filter by status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All results</SelectItem>
                        <SelectItem value="pass">Passed</SelectItem>
                        <SelectItem value="fail">Failed</SelectItem>
                        <SelectItem value="auto">Auto-submitted</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={(value) => changeFilter(setDateFilter, value)}>
                    <SelectTrigger className="w-40" aria-label="Filter by date">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Any time</SelectItem>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 3 months</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value ?? "newest")}>
                    <SelectTrigger className="w-44" aria-label="Sort">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                        <SelectItem value="score-high">Highest score</SelectItem>
                        <SelectItem value="score-low">Lowest score</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading && (
                <div className="mt-4 flex flex-col gap-3">
                    <Skeleton className="h-18 w-full rounded-xl" />
                    <Skeleton className="h-18 w-full rounded-xl" />
                    <Skeleton className="h-18 w-full rounded-xl" />
                </div>
            )}

            {error && (
                <div className="mt-4">
                    <ErrorState message={error} onRetry={() => window.location.reload()} />
                </div>
            )}

            {!loading && !error && results.length === 0 && (
                <div className="mt-4">
                    <EmptyState
                        icon={ClipboardList}
                        title="No results yet"
                        description="You haven't completed any exams yet."
                    />
                </div>
            )}

            {!loading && !error && results.length > 0 && sorted.length === 0 && (
                <div className="mt-4">
                    <EmptyState icon={ClipboardList} title="No matches" description="Try changing the filters." />
                </div>
            )}

            <div className="mt-4 flex flex-col gap-3">
                {pageItems.map((result) => (
                    <Link
                        key={result.id}
                        href={`/student/exams/${result.examId}/results?attemptId=${result.id}`}
                        className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
                    >
                        <div>
                            <p className="font-semibold">{result.examTitle}</p>
                            <p className="text-sm text-muted-foreground">
                                {result.classroomName} · {result.score ?? 0} / {result.totalMarks} ·{" "}
                                {result.percentage.toFixed(1)}%
                                {result.submittedAt && (
                                    <>
                                        {" · "}
                                        <RelativeDate date={result.submittedAt} />
                                    </>
                                )}
                            </p>
                            {result.autoSubmitReason && (
                                <p className="mt-1 text-xs text-destructive">
                                    Auto-submitted — {result.autoSubmitReason}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                            {result.autoSubmitReason && <Badge variant="outline">Auto-submitted</Badge>}
                            <Badge variant={result.pass ? "default" : "destructive"}>
                                {result.pass ? "Pass" : "Fail"}
                            </Badge>
                        </div>
                    </Link>
                ))}
            </div>

            <SimplePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}
