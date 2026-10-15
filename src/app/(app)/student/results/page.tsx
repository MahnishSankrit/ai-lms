// Lists every exam the student has completed, with score and pass/fail.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type ResultSummary = {
    id: string; // this is the attemptId
    examId: string;
    examTitle: string;
    score: number | null;
    totalMarks: number;
    percentage: number;
    pass: boolean;
};

export default function StudentResultsPage() {
    const [results, setResults] = useState<ResultSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/results/students")
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

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">My Results</h1>

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

            <div className="mt-4 flex flex-col gap-3">
                {results.map((result) => (
                    <Link
                        key={result.id}
                        href={`/student/exams/${result.examId}/results?attemptId=${result.id}`}
                        className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
                    >
                        <div>
                            <p className="font-semibold">{result.examTitle}</p>
                            <p className="text-sm text-muted-foreground">
                                {result.score ?? 0} / {result.totalMarks} · {result.percentage.toFixed(1)}%
                            </p>
                        </div>

                        <Badge variant={result.pass ? "default" : "destructive"}>
                            {result.pass ? "Pass" : "Fail"}
                        </Badge>
                    </Link>
                ))}
            </div>
        </div>
    );
}
