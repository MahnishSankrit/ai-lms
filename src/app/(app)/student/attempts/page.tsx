// Shows every exam attempt the student has ever started, including
// ones still in progress -- unlike /student/results, which only shows
// submitted ones.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

type Attempt = {
    id: string;
    examId: string;
    status: string;
    score: number | null;
    startedAt: string;
    submittedAt: string | null;
    exam: { title: string; totalMarks: number };
};

function statusVariant(status: string) {
    if (status === "submitted") return "default" as const;
    if (status === "auto_submitted") return "destructive" as const;
    return "secondary" as const; // in_progress
}

export default function StudentAttemptsPage() {
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAttempts = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/attempts/history");
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

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Attempt History</h1>

            <div className="mt-6">
                {loading && <Skeleton className="h-40 w-full rounded-xl" />}
                {error && <ErrorState message={error} onRetry={loadAttempts} />}

                {!loading && !error && attempts.length === 0 && (
                    <EmptyState
                        icon={History}
                        title="No attempts yet"
                        description="Exams you start will show up here."
                    />
                )}

                {!loading && !error && attempts.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Exam</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Started</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attempts.map((attempt) => (
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
                                    <TableCell>
                                        <Badge variant={statusVariant(attempt.status)} className="capitalize">
                                            {attempt.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {attempt.score === null ? "—" : `${attempt.score} / ${attempt.exam.totalMarks}`}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(attempt.startedAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
