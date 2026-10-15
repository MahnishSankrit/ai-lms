// Lists every published exam the student can take, across all their
// classrooms, using the same /api/exams/get-exams the dashboard preview
// and classroom detail page already use.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type Exam = {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    startsAt: string | null;
    endsAt: string | null;
    classroom: { id: string; name: string };
};

export default function StudentExamsPage() {
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
            <h1 className="text-2xl font-bold tracking-tight">Upcoming Exams</h1>

            <div className="mt-6">
                {loading && (
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                )}

                {error && <ErrorState message={error} onRetry={loadExams} />}

                {!loading && !error && exams.length === 0 && (
                    <EmptyState
                        icon={CalendarClock}
                        title="No exams available"
                        description="Your teacher hasn't published any exams yet."
                    />
                )}

                <div className="flex flex-col gap-3">
                    {exams.map((exam) => (
                        <Link key={exam.id} href={`/student/exams/${exam.id}`} className="group/card-link rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                            <Card className="h-full transition hover:bg-muted/50 hover:shadow-md hover:ring-primary/40 group-active/card-link:bg-muted">
                                <CardContent className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{exam.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {exam.classroom.name} · {exam.durationMinutes} min · {exam.totalMarks} marks
                                        </p>
                                    </div>
                                    {exam.startsAt && (
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(exam.startsAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
