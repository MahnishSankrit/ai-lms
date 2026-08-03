// Shows the result for one exam attempt: score, pass/fail, and a
// question-by-question review.
//
// Note: the results API is keyed by attemptId, not examId, so this page
// reads ?attemptId=... from the URL (the exam-taking page adds it when
// it redirects here after submitting).

"use client"

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Violation = {
    id: string;
    type: string;
    details: string | null;
};

type AnsweredQuestion = {
    id: string;
    isCorrect: boolean | null;
    marksAwarded: number | null;
    question: {
        questionText: string;
        marks: number;
    };
};

type ResultData = {
    examTitle: string;
    score: number;
    totalMarks: number;
    percentage: number;
    pass: boolean;
    violations: Violation[];
    answers: AnsweredQuestion[];
};

function ExamResultContent() {
    const searchParams = useSearchParams();
    const attemptId = searchParams.get("attemptId");

    const [result, setResult] = useState<ResultData | null>(null);
    const [error, setError] = useState(attemptId ? "" : "No attempt was specified.");
    const [loading, setLoading] = useState(Boolean(attemptId));

    useEffect(() => {
        if (!attemptId) return;

        fetch(`/api/results/${attemptId}`)
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                    setError(data.error || "Failed to load result");
                    return;
                }
                setResult(data.result);
            })
            .catch((err) => {
                console.error("Error loading result:", err);
                setError("Something went wrong. Please try again.");
            })
            .finally(() => setLoading(false));
    }, [attemptId]);

    if (loading) {
        return <p className="text-sm text-slate-500">Loading result...</p>;
    }

    if (error) {
        return <p className="text-sm text-red-600">{error}</p>;
    }

    if (!result) {
        return null;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{result.examTitle}</h1>

            <div className="mt-4 flex flex-wrap gap-4">
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Score</p>
                    <p className="text-lg font-semibold text-slate-900">
                        {result.score} / {result.totalMarks}
                    </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Percentage</p>
                    <p className="text-lg font-semibold text-slate-900">{result.percentage.toFixed(1)}%</p>
                </div>

                <div
                    className={`rounded-md border px-4 py-3 ${
                        result.pass ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                >
                    <p className="text-xs text-slate-500">Result</p>
                    <p className={`text-lg font-semibold ${result.pass ? "text-green-700" : "text-red-700"}`}>
                        {result.pass ? "Pass" : "Fail"}
                    </p>
                </div>
            </div>

            {result.violations.length > 0 && (
                <div className="mt-6 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    {result.violations.length} anti-cheat violation(s) were recorded during this attempt.
                </div>
            )}

            <h2 className="mt-8 text-lg font-semibold text-slate-900">Answer review</h2>
            <div className="mt-4 flex flex-col gap-3">
                {result.answers.map((answer, index) => (
                    <div key={answer.id} className="rounded-md border border-slate-200 bg-white p-4">
                        <p className="font-medium text-slate-900">
                            {index + 1}. {answer.question.questionText}
                        </p>
                        <p className="mt-1 text-sm">
                            {answer.isCorrect === true && <span className="text-green-700">Correct</span>}
                            {answer.isCorrect === false && <span className="text-red-700">Incorrect</span>}
                            {answer.isCorrect === null && <span className="text-slate-500">Not answered</span>}
                            {" · "}
                            {answer.marksAwarded ?? 0} / {answer.question.marks} marks
                        </p>
                    </div>
                ))}
            </div>

            <Link href="/student/results" className="mt-8 inline-block text-sm font-semibold text-blue-700 hover:underline">
                Back to all results
            </Link>
        </div>
    );
}

export default function ExamResultPage() {
    return (
        <Suspense>
            <ExamResultContent />
        </Suspense>
    );
}
