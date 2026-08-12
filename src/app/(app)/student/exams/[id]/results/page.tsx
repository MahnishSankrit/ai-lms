// Shows the result for one exam attempt: score, pass/fail, and a
// question-by-question review.
//
// Note: the results API is keyed by attemptId, not examId, so this page
// reads ?attemptId=... from the URL (the exam-taking page adds it when
// it redirects here after submitting).
//
// The per-question correct/incorrect breakdown and explanations stay
// hidden for an hour after the exam ends -- see answersRevealed below --
// so an early finisher can't tell classmates still taking it the answers.

"use client"

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/error-state";

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
    answersRevealed: boolean;
    answersRevealAt: string | null;
};

function ExamResultContent() {
    const searchParams = useSearchParams();
    const attemptId = searchParams.get("attemptId");

    const [result, setResult] = useState<ResultData | null>(null);
    const [error, setError] = useState(attemptId ? "" : "No attempt was specified.");
    const [loading, setLoading] = useState(Boolean(attemptId));

    const loadResult = () => {
        if (!attemptId) return;
        setLoading(true);

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
    };

    useEffect(() => {
        loadResult();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attemptId]);

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        );
    }

    if (error) {
        return <ErrorState message={error} onRetry={loadResult} />;
    }

    if (!result) {
        return null;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{result.examTitle}</h1>

            <div className="mt-4 flex flex-wrap gap-4">
                <Card>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Score</p>
                        <p className="text-lg font-semibold">
                            {result.score} / {result.totalMarks}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Percentage</p>
                        <p className="text-lg font-semibold">{result.percentage.toFixed(1)}%</p>
                    </CardContent>
                </Card>

                <Card className={result.pass ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Result</p>
                        <p className={`text-lg font-semibold ${result.pass ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                            {result.pass ? "Pass" : "Fail"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {result.violations.length > 0 && (
                <div className="mt-6 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                    {result.violations.length} anti-cheat violation(s) were recorded during this attempt.
                </div>
            )}

            <h2 className="mt-8 text-lg font-semibold">Answer review</h2>

            {!result.answersRevealed ? (
                <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
                    <Lock className="size-6 text-muted-foreground" />
                    <div>
                        <p className="font-medium">Answers aren&apos;t available yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            To keep the exam fair for everyone, the correct answers and explanations unlock
                            {result.answersRevealAt
                                ? ` at ${new Date(result.answersRevealAt).toLocaleString()}`
                                : " after the exam window closes"}
                            .
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mt-4 flex flex-col gap-3">
                    {result.answers.map((answer, index) => (
                        <Card key={answer.id}>
                            <CardContent>
                                <p className="font-medium">
                                    {index + 1}. {answer.question.questionText}
                                </p>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    {answer.isCorrect === true && <Badge>Correct</Badge>}
                                    {answer.isCorrect === false && <Badge variant="destructive">Incorrect</Badge>}
                                    {answer.isCorrect === null && <Badge variant="secondary">Not answered</Badge>}
                                    <span className="text-muted-foreground">
                                        {answer.marksAwarded ?? 0} / {answer.question.marks} marks
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Link href="/student/results" className="mt-8 inline-block text-sm font-semibold text-primary hover:underline">
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
