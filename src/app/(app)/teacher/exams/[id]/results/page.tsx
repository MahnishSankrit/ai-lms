// Shows aggregate stats for one exam (average/highest/lowest score,
// pass/fail counts) and a table of every student's attempt.

"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Statistic = {
    totalAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passcount: number;
    failcount: number;
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
                setStatistic(data.statistic);
                setAttempts(data.attempts);
            })
            .catch((err) => {
                console.error("Error loading exam results:", err);
                setError("Something went wrong. Please try again.");
            })
            .finally(() => setLoading(false));
    }, [examId]);

    if (loading) return <p className="text-sm text-slate-500">Loading results...</p>;
    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!statistic) return null;

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{examTitle} — Results</h1>

            <div className="mt-4 flex flex-wrap gap-4">
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Attempts</p>
                    <p className="text-lg font-semibold text-slate-900">{statistic.totalAttempts}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Average</p>
                    <p className="text-lg font-semibold text-slate-900">{statistic.averageScore.toFixed(1)}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Highest</p>
                    <p className="text-lg font-semibold text-slate-900">{statistic.highestScore}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Lowest</p>
                    <p className="text-lg font-semibold text-slate-900">{statistic.lowestScore}</p>
                </div>
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Passed</p>
                    <p className="text-lg font-semibold text-green-700">{statistic.passcount}</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Failed</p>
                    <p className="text-lg font-semibold text-red-700">{statistic.failcount}</p>
                </div>
            </div>

            <h2 className="mt-8 text-lg font-semibold text-slate-900">Student attempts</h2>

            {attempts.length === 0 && <p className="mt-2 text-sm text-slate-500">No attempts yet.</p>}

            <div className="mt-4 flex flex-col gap-2">
                {attempts.map((attempt) => (
                    <Link
                        key={attempt.id}
                        href={`/teacher/exams/${examId}/results/${attempt.id}`}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-sm hover:border-blue-400"
                    >
                        <span className="text-slate-700">{attempt.student.email}</span>
                        <span className="capitalize text-slate-500">{attempt.status}</span>
                        <span className="font-semibold text-slate-900">{attempt.score ?? "-"}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
