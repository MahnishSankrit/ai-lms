// Overview of all the teacher's exams, each linking to its own results
// page (/teacher/exams/[id]/results). There's no single API that
// aggregates results across every exam, so this just reuses the exams
// list instead of adding a new backend endpoint.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type Exam = {
    id: string;
    title: string;
    status: string;
    classroom: { id: string; name: string };
};

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
            <h1 className="text-2xl font-bold tracking-tight">Results</h1>
            <p className="text-sm text-muted-foreground">Pick an exam to see its statistics and attempts.</p>

            <div className="mt-6">
                {loading && <Skeleton className="h-40 w-full rounded-xl" />}
                {error && <ErrorState message={error} onRetry={loadExams} />}

                {!loading && !error && exams.length === 0 && (
                    <EmptyState
                        icon={BarChart3}
                        title="No exams yet"
                        description="Create an exam first to see results here."
                    />
                )}

                <div className="flex flex-col gap-3">
                    {exams.map((exam) => (
                        <Link key={exam.id} href={`/teacher/exams/${exam.id}/results`}>
                            <Card className="transition hover:border-primary/40 hover:shadow-md">
                                <CardContent className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{exam.title}</p>
                                        <p className="text-sm text-muted-foreground">{exam.classroom.name}</p>
                                    </div>
                                    <Badge variant="secondary" className="capitalize">{exam.status}</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
