// Lists every exam the student has completed, with score and pass/fail.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";

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
            <h1 className="text-2xl font-bold text-slate-900">My Results</h1>

            {loading && <p className="mt-4 text-sm text-slate-500">Loading results...</p>}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            {!loading && !error && results.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">You haven&apos;t completed any exams yet.</p>
            )}

            <div className="mt-4 flex flex-col gap-3">
                {results.map((result) => (
                    <Link
                        key={result.id}
                        href={`/student/exams/${result.examId}/results?attemptId=${result.id}`}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 hover:border-blue-400"
                    >
                        <div>
                            <p className="font-semibold text-slate-900">{result.examTitle}</p>
                            <p className="text-sm text-slate-500">
                                {result.score ?? 0} / {result.totalMarks} · {result.percentage.toFixed(1)}%
                            </p>
                        </div>

                        <span
                            className={`rounded-md px-3 py-1 text-xs font-semibold ${
                                result.pass ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            }`}
                        >
                            {result.pass ? "Pass" : "Fail"}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
