// Shows every exam attempt the student has ever started, including
// ones still in progress -- unlike /student/results, which only shows
// finished ones.
//
// We load ALL attempts once, then filter, sort and paginate them here in
// the browser. A student only has a few dozen attempts, so that's fine
// and keeps the code simple (no extra API parameters).

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";
import RelativeDate from "@/components/relative-date";
import SimplePagination from "@/components/simple-pagination";

const PAGE_SIZE = 10;

type Attempt = {
    id: string;
    examId: string;
    status: string;
    score: number | null;
    startedAt: string;
    submittedAt: string | null;
    exam: {
        title: string;
        totalMarks: number;
        classroom: { id: string; name: string };
    };
    autoSubmitReason: string | null; // e.g. "Time ran out" -- see lib/attempt-reason.ts
};

function statusVariant(status: string) {
    if (status === "submitted") return "default" as const;
    if (status === "auto_submitted") return "destructive" as const;
    return "secondary" as const; // in_progress
}

// true if the date is within the last `days` days.
function isWithinDays(date: string, days: number) {
    const millisecondsAgo = Date.now() - new Date(date).getTime();
    return millisecondsAgo <= days * 24 * 60 * 60 * 1000;
}

export default function StudentAttemptsPage() {
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters, sort and page
    const [classroomFilter, setClassroomFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all"); // "all" or a number of days
    const [sortBy, setSortBy] = useState("newest");
    const [page, setPage] = useState(1);

    const loadAttempts = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/attempts/history?limit=500");
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load attempt history");
                return;
            }

            setAttempts(data.attempts);
        } catch (err) {
            console.error("Error loading attempt history:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttempts();
    }, []);

    // List of classrooms for the dropdown (each one only once).
    const classrooms: { id: string; name: string }[] = [];
    for (const attempt of attempts) {
        const alreadyAdded = classrooms.some((c) => c.id === attempt.exam.classroom.id);
        if (!alreadyAdded) {
            classrooms.push(attempt.exam.classroom);
        }
    }

    // Step 1: filter
    const filtered = attempts.filter((attempt) => {
        if (classroomFilter !== "all" && attempt.exam.classroom.id !== classroomFilter) return false;
        if (statusFilter !== "all" && attempt.status !== statusFilter) return false;
        if (dateFilter !== "all" && !isWithinDays(attempt.startedAt, Number(dateFilter))) return false;
        return true;
    });

    // Step 2: sort (copy first with [...] so we don't change the original list)
    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === "oldest") {
            return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        }
        if (sortBy === "score-high") {
            return (b.score ?? -1) - (a.score ?? -1);
        }
        if (sortBy === "score-low") {
            return (a.score ?? -1) - (b.score ?? -1);
        }
        // "newest" (default)
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
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
            <h1 className="text-2xl font-bold tracking-tight">Attempt History</h1>

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
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="auto_submitted">Auto submitted</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
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

            <div className="mt-4">
                {loading && <Skeleton className="h-40 w-full rounded-xl" />}
                {error && <ErrorState message={error} onRetry={loadAttempts} />}

                {!loading && !error && attempts.length === 0 && (
                    <EmptyState
                        icon={History}
                        title="No attempts yet"
                        description="Exams you start will show up here."
                    />
                )}

                {!loading && !error && attempts.length > 0 && sorted.length === 0 && (
                    <EmptyState icon={History} title="No matches" description="Try changing the filters." />
                )}

                {!loading && !error && pageItems.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Exam</TableHead>
                                <TableHead>Classroom</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Started</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageItems.map((attempt) => (
                                <TableRow key={attempt.id}>
                                    <TableCell>
                                        {attempt.status === "in_progress" ? (
                                            <Link href={`/student/exams/${attempt.examId}`} className="font-medium hover:underline">
                                                {attempt.exam.title}
                                            </Link>
                                        ) : (
                                            <Link
                                                href={`/student/exams/${attempt.examId}/results?attemptId=${attempt.id}`}
                                                className="font-medium hover:underline"
                                            >
                                                {attempt.exam.title}
                                            </Link>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{attempt.exam.classroom.name}</TableCell>
                                    <TableCell>
                                        {attempt.autoSubmitReason ? (
                                            // Auto-submitted: show the reason under the badge.
                                            // `title` also shows it when you hover the badge.
                                            <div title={attempt.autoSubmitReason}>
                                                <Badge variant="destructive">Auto submitted</Badge>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {attempt.autoSubmitReason}
                                                </p>
                                            </div>
                                        ) : (
                                            <Badge variant={statusVariant(attempt.status)} className="capitalize">
                                                {attempt.status.replace("_", " ")}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {attempt.score === null ? "—" : `${attempt.score} / ${attempt.exam.totalMarks}`}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <RelativeDate date={attempt.startedAt} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <SimplePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
        </div>
    );
}
