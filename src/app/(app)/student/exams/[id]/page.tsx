// The exam-taking screen.
//
// What this page does, step by step:
// 1. Loads the exam questions.
// 2. If an attempt is already in progress, resumes it directly.
// 3. Otherwise, if the exam requires a code, shows a small form asking
//    for it -- the teacher shares this code separately from the exam
//    link, so only students who were actually given it can start.
// 4. Runs a countdown timer. When it hits 0, the exam auto-submits.
// 5. Saves each answer to the server as soon as the student picks it
//    (so refreshing the page doesn't lose progress).
// 6. Watches for the student switching tabs (a basic anti-cheat check).
//    Too many tab switches force-submits the exam.
// 7. Lets the student submit manually with a "Submit exam" button.

"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Option = {
    id: string;
    optionText: string;
};

type Question = {
    id: string;
    question: string;
    type: string;
    options: Option[];
    marks: number;
};

type ExamData = {
    id: string;
    title: string;
    description: string | null;
    duration: number; // minutes
    requiresAccessCode: boolean;
    fullscreenRequired: boolean;
    questions: Question[];
};

export default function TakeExamPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;

    const [exam, setExam] = useState<ExamData | null>(null);
    const [attemptId, setAttemptId] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // "loading" | "needs-code" | "ready" | "already-done" | "error"
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [accessCode, setAccessCode] = useState("");
    const [codeError, setCodeError] = useState("");
    const [startingAttempt, setStartingAttempt] = useState(false);


    // Loads the exam, then checks whether an attempt is already in
    // progress. If not, the student needs to start one (possibly with a code).
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

                // Try resuming an attempt that's already in progress.
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
                        } else if (answer.answerText) {
                            previousAnswers[answer.questionId] = answer.answerText;
                        }
                    }
                    setAnswers(previousAnswers);
                    setStatus("ready");
                    return;
                }

                // No attempt exists yet -- that's the normal case for a
                // student who hasn't started. Anything else (already
                // submitted, time expired) means the exam is finished.
                if (resumeData.error === "No attempt found") {
                    setStatus("needs-code");
                } else {
                    setStatus("already-done");
                }
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

    // Step 6: basic anti-cheat. Each of these logs a violation to the
    // server via logViolation() below; the server itself decides whether
    // enough violations have piled up to auto-submit the attempt.
    useEffect(() => {
        if (status !== "ready") return;

        const handleVisibilityChange = () => {
            if (!document.hidden) return;
            logViolation("tab_switch", "Switched away from the exam tab");
        };

        const handleCopyOrPaste = (e: Event) => {
            logViolation("copy_paste", `${e.type} detected`);
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logViolation("right_click", "Right-click detected");
        };

        const handleFullscreenChange = () => {
            if (exam?.fullscreenRequired && !document.fullscreenElement) {
                logViolation("fullscreen_exit", "Exited fullscreen mode");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("copy", handleCopyOrPaste);
        document.addEventListener("paste", handleCopyOrPaste);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("copy", handleCopyOrPaste);
            document.removeEventListener("paste", handleCopyOrPaste);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    // Starts a brand new attempt, checking the code if the exam requires one.
    const handleStartAttempt = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCodeError("");
        setStartingAttempt(true);

        try {
            const response = await fetch("/api/attempts/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId, accessCode }),
            });
            const data = await response.json();

            if (!response.ok) {
                setCodeError(data.error || "Could not start the exam");
                return;
            }

            setAttemptId(data.attemptId);
            setRemainingSeconds((exam?.duration ?? 0) * 60);
            setStatus("ready");
        } catch (err) {
            console.error("Error starting exam:", err);
            setCodeError("Something went wrong. Please try again.");
        } finally {
            setStartingAttempt(false);
        }
    };

    // Step 5: save one answer as soon as it's picked.
    const handleSelectOption = async (questionId: string, optionId: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
        await saveAnswer({ questionId, selectedOptionId: optionId });
    };

    // Short-answer questions are free text instead of a picked option.
    // Saved on blur (not every keystroke) to avoid spamming the API.
    const handleSaveTextAnswer = async (questionId: string, text: string) => {
        await saveAnswer({ questionId, answerText: text });
    };

    const saveAnswer = async (payload: { questionId: string; selectedOptionId?: string; answerText?: string }) => {
        setSaveError("");

        try {
            const response = await fetch("/api/attempts/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId, ...payload }),
            });

            if (!response.ok) {
                setSaveError("Your last answer wasn't saved. Please try again.");
            }
        } catch (err) {
            console.error("Error saving answer:", err);
            setSaveError("Your last answer wasn't saved. Please try again.");
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

    // Logs one anti-cheat violation. The server decides whether this
    // pushes the attempt over its violation limit and auto-submits it.
    const logViolation = async (type: string, details: string) => {
        try {
            const response = await fetch("/api/violations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId, type, details }),
            });
            const data = await response.json();

            if (response.ok && data.autoSubmitted) {
                goToResults();
            }
        } catch (err) {
            console.error("Error logging violation:", err);
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

    if (status === "needs-code") {
        return (
            <div className="mx-auto max-w-sm">
                <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
                <p className="mt-2 text-sm text-slate-600">
                    {exam.duration} minutes · {exam.questions.length} question(s)
                </p>

                <form onSubmit={handleStartAttempt} className="mt-6 flex flex-col gap-3">
                    {exam.requiresAccessCode && (
                        <>
                            <label className="text-sm font-medium text-slate-700">
                                Enter the exam code your teacher gave you
                                <input
                                    type="text"
                                    required
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                />
                            </label>
                            {codeError && <p className="text-sm text-red-600">{codeError}</p>}
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={startingAttempt}
                        className="rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                        {startingAttempt ? "Starting..." : "Start exam"}
                    </button>
                </form>
            </div>
        );
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

                        {question.type === "short_answer" ? (
                            <textarea
                                defaultValue={answers[question.id] ?? ""}
                                onBlur={(e) => {
                                    setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }));
                                    handleSaveTextAnswer(question.id, e.target.value);
                                }}
                                placeholder="Type your answer..."
                                className="mt-3 w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-blue-600"
                                rows={3}
                            />
                        ) : (
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
                        )}
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
