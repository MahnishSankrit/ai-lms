// The exam-taking screen.
//
// What this page does, step by step:
// 1. Loads the exam questions.
// 2. Starts a new attempt, or resumes one already in progress.
// 3. Runs a countdown timer. When it hits 0, the exam auto-submits.
// 4. Saves each answer to the server as soon as the student picks it
//    (so refreshing the page doesn't lose progress).
// 5. Watches for the student switching tabs (a basic anti-cheat check).
//    Too many tab switches force-submits the exam.
// 6. Lets the student submit manually with a "Submit exam" button.

"use client"

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Option = {
    id: string;
    optionText: string;
};

type Question = {
    id: string;
    question: string;
    options: Option[];
    marks: number;
};

type ExamData = {
    id: string;
    title: string;
    description: string | null;
    duration: number; // minutes
    questions: Question[];
};

// The student-facing exam API doesn't currently send the exam's configured
// tab-switch limit, so we use a fixed number here for now.
const MAX_TAB_SWITCHES = 3;

export default function TakeExamPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;

    const [exam, setExam] = useState<ExamData | null>(null);
    const [attemptId, setAttemptId] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // "loading" | "ready" | "already-done" | "error"
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const tabSwitchCount = useRef(0);

    // Step 1 + 2: load the exam, then start or resume the attempt.
    useEffect(() => {
        const setup = async () => {
            try {
                const examResponse = await fetch(`/api/exams/${examId}`);
                const examData = await examResponse.json();

                if (!examResponse.ok) {
                    setError(examData.error || "Failed to load exam");
                    setStatus("error");
                    return;
                }

                setExam(examData.exam);

                // Try starting a brand new attempt first.
                const startResponse = await fetch("/api/attempts/start", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ examId }),
                });
                const startData = await startResponse.json();

                if (startResponse.ok) {
                    setAttemptId(startData.attemptId);
                    setRemainingSeconds(examData.exam.duration * 60);
                    setStatus("ready");
                    return;
                }

                // Starting failed because an attempt already exists.
                // Try resuming it instead.
                const resumeResponse = await fetch("/api/attempts/resume", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ examId }),
                });
                const resumeData = await resumeResponse.json();

                if (resumeResponse.ok) {
                    setAttemptId(resumeData.attemptId);
                    setRemainingSeconds(resumeData.remainingMinutes * 60);

                    const previousAnswers: Record<string, string> = {};
                    for (const answer of resumeData.answers) {
                        if (answer.selectedOptionId) {
                            previousAnswers[answer.questionId] = answer.selectedOptionId;
                        }
                    }
                    setAnswers(previousAnswers);
                    setStatus("ready");
                    return;
                }

                // Could not start or resume: the exam is already finished.
                setStatus("already-done");
            } catch (err) {
                console.error("Error setting up exam:", err);
                setError("Something went wrong. Please try again.");
                setStatus("error");
            }
        };

        setup();
    }, [examId]);

    // Step 3: the countdown timer.
    useEffect(() => {
        if (status !== "ready") return;

        const timer = setInterval(() => {
            setRemainingSeconds((seconds) => {
                if (seconds <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return seconds - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    // Step 5: basic anti-cheat — count tab switches.
    useEffect(() => {
        if (status !== "ready") return;

        const handleVisibilityChange = () => {
            if (!document.hidden) return;

            tabSwitchCount.current += 1;

            if (tabSwitchCount.current > MAX_TAB_SWITCHES) {
                forceSubmit(`Tab switched ${tabSwitchCount.current} times`);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    // Step 4: save one answer as soon as it's picked.
    const handleSelectOption = async (questionId: string, optionId: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
        setSaveError("");

        try {
            const response = await fetch("/api/attempts/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attemptId,
                    questionId,
                    selectedOptionId: optionId,
                }),
            });

            if (!response.ok) {
                setSaveError("Your last answer wasn't saved. Please try selecting it again.");
            }
        } catch (err) {
            console.error("Error saving answer:", err);
            setSaveError("Your last answer wasn't saved. Please try selecting it again.");
        }
    };

    const goToResults = () => {
        router.push(`/student/exams/${examId}/results?attemptId=${attemptId}`);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const response = await fetch("/api/attempts/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId }),
            });

            if (response.ok) {
                goToResults();
            }
        } catch (err) {
            console.error("Error submitting exam:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const forceSubmit = async (reason: string) => {
        try {
            await fetch("/api/attempts/force-submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId, reason }),
            });
        } catch (err) {
            console.error("Error force-submitting exam:", err);
        } finally {
            goToResults();
        }
    };

    if (status === "loading") {
        return <p className="text-sm text-slate-500">Loading exam...</p>;
    }

    if (status === "error") {
        return <p className="text-sm text-red-600">{error}</p>;
    }

    if (status === "already-done") {
        return (
            <div>
                <p className="text-sm text-slate-700">
                    You have already completed this exam.
                </p>
                <a href="/student/results" className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
                    View my results
                </a>
            </div>
        );
    }

    if (!exam) {
        return null;
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
                <span className="rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                    Time left: {timeLabel}
                </span>
            </div>

            {exam.description && <p className="mt-2 text-sm text-slate-600">{exam.description}</p>}

            {saveError && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {saveError}
                </p>
            )}

            <div className="mt-8 flex flex-col gap-6">
                {exam.questions.map((question, index) => (
                    <div key={question.id} className="rounded-md border border-slate-200 bg-white p-4">
                        <p className="font-medium text-slate-900">
                            {index + 1}. {question.question}{" "}
                            <span className="text-xs font-normal text-slate-400">({question.marks} marks)</span>
                        </p>

                        <div className="mt-3 flex flex-col gap-2">
                            {question.options.map((option) => (
                                <label
                                    key={option.id}
                                    className="flex items-center gap-2 text-sm text-slate-700"
                                >
                                    <input
                                        type="radio"
                                        name={question.id}
                                        checked={answers[question.id] === option.id}
                                        onChange={() => handleSelectOption(question.id, option.id)}
                                    />
                                    {option.optionText}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => {
                    if (confirm("Submit the exam? You cannot change your answers after this.")) {
                        handleSubmit();
                    }
                }}
                disabled={submitting}
                className="mt-8 rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
                {submitting ? "Submitting..." : "Submit exam"}
            </button>
        </div>
    );
}
