// Shows aggregate stats for one exam (average/highest/lowest score,
// pass/fail counts) and a table of every student's attempt.

"use client"

import { useEffect, useState } from "react";
import PageSkeleton from "@/components/page-skeleton";
import { useParams } from "next/navigation";
import Link from "next/link";

type Statistic = {
    totalAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    // null when the exam has no passing mark
    passcount: number | null;
    failcount: number | null;
};

type Attempt = {
    id: string;
    student: { id: string; email: string };
    score: number | null;
    status: string;
    submittedAt: string | null;
};

export default function ExamResultsPage() {
    const params = useParams();
    const examId = params.id as string;

    const [examTitle, setExamTitle] = useState("");
    const [totalMarks, setTotalMarks] = useState(0);
    const [statistic, setStatistic] = useState<Statistic | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/exams/${examId}/results`)
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || "Failed to load results");
                    return;
                }

                setExamTitle(data.exam.title);
                setTotalMarks(data.exam.totalMarks);
                setStatistic(data.statistic);
                setAttempts(data.attempts);
            })
            .catch((err) => {
                console.error("Error loading exam results:", err);
                setError("Something went wrong. Please try again.");
            })
            .finally(() => setLoading(false));
    }, [examId]);

    if (loading) return <PageSkeleton />;
    if (error) return <p className="text-sm text-destructive">{error}</p>;
    if (!statistic) return null;

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{examTitle} — Results</h1>

            <div className="mt-4 flex flex-wrap gap-4">
                <div className="rounded-md border border-border bg-card px-4 py-3">
                    <p className="text-xs text-muted-foreground">Attempts</p>
                    <p className="text-lg font-semibold text-foreground">{statistic.totalAttempts}</p>
                </div>
                <div className="rounded-md border border-border bg-card px-4 py-3">
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="text-lg font-semibold text-foreground">{statistic.averageScore.toFixed(1)}/{totalMarks}</p>
                </div>
                <div className="rounded-md border border-border bg-card px-4 py-3">
                    <p className="text-xs text-muted-foreground">Highest</p>
                    <p className="text-lg font-semibold text-foreground">{statistic.highestScore}/{totalMarks}</p>
                </div>
                <div className="rounded-md border border-border bg-card px-4 py-3">
                    <p className="text-xs text-muted-foreground">Lowest</p>
                    <p className="text-lg font-semibold text-foreground">{statistic.lowestScore}/{totalMarks}</p>
                </div>
                {/* No passing mark set = no pass/fail to show */}
                {statistic.passcount !== null && statistic.failcount !== null && (
                    <>
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3">
                            <p className="text-xs text-muted-foreground">Passed</p>
                            <p className="text-lg font-semibold text-green-700 dark:text-green-400">{statistic.passcount}</p>
                        </div>
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
                            <p className="text-xs text-muted-foreground">Failed</p>
                            <p className="text-lg font-semibold text-destructive">{statistic.failcount}</p>
                        </div>
                    </>
                )}
            </div>

            <h2 className="mt-8 text-lg font-semibold text-foreground">Student attempts</h2>

            {attempts.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No attempts yet.</p>}

            <div className="mt-4 flex flex-col gap-2">
                {attempts.map((attempt) => (
                    <Link
                        key={attempt.id}
                        href={`/teacher/exams/${examId}/results/${attempt.id}`}
                        className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
                    >
                        <span className="text-foreground">{attempt.student.email}</span>
                        <span className="capitalize text-muted-foreground">{attempt.status}</span>
                        <span className="font-semibold text-foreground">{attempt.score === null ? "-" : `${attempt.score}/${totalMarks}`}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
