// Overview of all the teacher's exams, each linking to its own results
// page (/teacher/exams/[id]/results).
// Each card shows the numbers a teacher cares about here -- attempts,
// average score and pass rate -- which come with the exams list from
// /api/exams/get-exams (worked out on the server), so no extra requests.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";
import PageHeader from "@/components/page-header";

type Exam = {
    id: string;
    title: string;
    status: string;
    classroom: { id: string; name: string };
    attemptCount: number;
    averagePercentage: number | null; // null = no graded attempts yet
    passRate: number | null; // null = no attempts, or the exam has no pass mark
};

// One small number block on a card (label on top, value below).
function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
        </div>
    );
}

export default function TeacherResultsOverviewPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadExams = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/exams/get-exams");
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load exams");
                return;
            }

            setExams(data.exams);
        } catch (err) {
            console.error("Error loading exams:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExams();
    }, []);

    return (
        <div>
            <PageHeader title="Results" description="How each exam went. Click a card for the full breakdown." />

            <div>
                {loading && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-36 rounded-xl" />
                        <Skeleton className="h-36 rounded-xl" />
                        <Skeleton className="h-36 rounded-xl" />
                    </div>
                )}
                {error && <ErrorState message={error} onRetry={loadExams} />}

                {!loading && !error && exams.length === 0 && (
                    <EmptyState
                        icon={BarChart3}
                        title="No exams yet"
                        description="Create an exam first to see results here."
                    />
                )}

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {exams.map((exam) => {
                        let averageText = "—";
                        if (exam.averagePercentage !== null) {
                            averageText = `${exam.averagePercentage.toFixed(0)}%`;
                        }

                        let passRateText = "—";
                        if (exam.passRate !== null) {
                            passRateText = `${exam.passRate.toFixed(0)}%`;
                        }

                        return (
                            <Link
                                key={exam.id}
                                href={`/teacher/exams/${exam.id}/results`}
                                className="group/card-link rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                                <Card className="h-full transition hover:bg-muted/50 hover:shadow-md hover:ring-primary/40 group-active/card-link:bg-muted">
                                    <CardContent>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{exam.title}</p>
                                                <p className="text-sm text-muted-foreground">{exam.classroom.name}</p>
                                            </div>
                                            <Badge variant="secondary" className="capitalize">{exam.status}</Badge>
                                        </div>

                                        {exam.attemptCount === 0 ? (
                                            <p className="mt-4 text-sm text-muted-foreground">No attempts yet</p>
                                        ) : (
                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                <Stat label="Attempts" value={exam.attemptCount} />
                                                <Stat label="Avg. score" value={averageText} />
                                                <Stat label="Pass rate" value={passRateText} />
                                            </div>
                                        )}

                                        {/* thin bar showing the average score */}
                                        {exam.averagePercentage !== null && (
                                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={{ width: `${Math.min(100, Math.max(0, exam.averagePercentage))}%` }}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
