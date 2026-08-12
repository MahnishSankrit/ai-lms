// Grading view for one student's exam attempt.
//
// MCQ-type answers are already auto-graded (shown read-only with a
// Correct/Incorrect badge), but short-answer questions are never
// auto-graded -- they always start at 0 marks until a teacher enters
// a mark here and saves it, which recalculates the attempt's total score.

"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/error-state";

type Option = {
    id: string;
    optionText: string;
};

type Answer = {
    id: string;
    selectedOptionId: string | null;
    answerText: string | null;
    isCorrect: boolean | null;
    marksAwarded: number | null;
    question: {
        questionText: string;
        type: string;
        marks: number;
        options: Option[];
    };
};

type Violation = {
    id: string;
    type: string;
    details: string | null;
    createdAt: string;
};

type AttemptDetail = {
    id: string;
    score: number | null;
    status: string;
    student: { email: string };
    exam: { title: string; totalMarks: number };
    answers: Answer[];
    violations: Violation[];
};

export default function GradeAttemptPage() {
    const params = useParams();
    const attemptId = params.attemptId as string;

    const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Marks currently typed into each answer's input, keyed by AttemptAnswer id.
    const [markInputs, setMarkInputs] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const loadAttempt = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`/api/attempts/${attemptId}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load attempt");
                return;
            }

            setAttempt(data.attempt);
            const inputs: Record<string, string> = {};
            for (const answer of data.attempt.answers) {
                inputs[answer.id] = answer.marksAwarded?.toString() ?? "";
            }
            setMarkInputs(inputs);
        } catch (err) {
            console.error("Error loading attempt:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttempt();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attemptId]);

    const handleSaveGrade = async (attemptAnswerId: string) => {
        const marksAwarded = Number(markInputs[attemptAnswerId]);

        if (Number.isNaN(marksAwarded)) {
            toast.error("Enter a valid number of marks");
            return;
        }

        setSavingId(attemptAnswerId);

        try {
            const response = await fetch("/api/results/manual-grade", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptAnswerId, marksAwarded }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not save grade");
                return;
            }

            toast.success("Grade saved");
            loadAttempt();
        } catch (err) {
            console.error("Error saving grade:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    if (error) return <ErrorState message={error} onRetry={loadAttempt} />;
    if (!attempt) return null;

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{attempt.exam.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                {attempt.student.email} · Score: {attempt.score ?? 0} / {attempt.exam.totalMarks}
            </p>

            {attempt.violations.length > 0 && (
                <div className="mt-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                        {attempt.violations.length} anti-cheat violation(s) recorded
                    </p>
                    <ul className="mt-2 flex flex-col gap-1">
                        {attempt.violations.map((violation) => (
                            <li key={violation.id} className="text-xs text-muted-foreground">
                                <span className="font-medium capitalize text-foreground">
                                    {violation.type.replace("_", " ")}
                                </span>
                                {violation.details && ` — ${violation.details}`}
                                {" · "}
                                {new Date(violation.createdAt).toLocaleString()}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
                {attempt.answers.map((answer, index) => {
                    const selectedOption = answer.question.options.find(
                        (option) => option.id === answer.selectedOptionId
                    );

                    return (
                        <Card key={answer.id}>
                            <CardContent>
                                <p className="font-medium">
                                    {index + 1}. {answer.question.questionText}{" "}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (out of {answer.question.marks} marks)
                                    </span>
                                </p>

                                <div className="mt-2 text-sm text-muted-foreground">
                                    {answer.question.type === "short_answer" ? (
                                        <p>
                                            Answer: <span className="text-foreground">{answer.answerText || "(no answer)"}</span>
                                        </p>
                                    ) : (
                                        <p>
                                            Selected: <span className="text-foreground">{selectedOption?.optionText || "(no answer)"}</span>
                                        </p>
                                    )}
                                </div>

                                {answer.isCorrect !== null && (
                                    <Badge className="mt-2" variant={answer.isCorrect ? "default" : "destructive"}>
                                        {answer.isCorrect ? "Correct" : "Incorrect"} (auto-graded)
                                    </Badge>
                                )}

                                <div className="mt-3 flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={answer.question.marks}
                                        step="0.5"
                                        className="w-24"
                                        value={markInputs[answer.id] ?? ""}
                                        onChange={(e) =>
                                            setMarkInputs((prev) => ({ ...prev, [answer.id]: e.target.value }))
                                        }
                                    />
                                    <span className="text-sm text-muted-foreground">/ {answer.question.marks} marks</span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={savingId === answer.id}
                                        onClick={() => handleSaveGrade(answer.id)}
                                    >
                                        {savingId === answer.id ? "Saving..." : "Save grade"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
