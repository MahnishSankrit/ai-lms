// Edit page for one exam.
//
// Three things happen here:
// 1. Edit the exam's basic info (title, description, duration, start/end time).
// 2. Manage which questions are attached to this exam (add from your
//    question bank, or remove ones already attached).
// 3. Publish the exam once it has questions and a start/end time.

"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Option = {
    id: string;
    optionText: string;
};

type BankQuestion = {
    id: string;
    questionText: string;
    marks: number;
    type: string;
    options: Option[];
};

type AttachedQuestion = {
    id: string; // this is the examQuestionId, needed to remove it
    question: BankQuestion;
};

type ExamData = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    durationMinutes: number;
    startsAt: string | null;
    endsAt: string | null;
    accessCode: string | null;
    questions: AttachedQuestion[];
};

// Converts an ISO date string into the format <input type="datetime-local"> needs.
function toDatetimeLocal(isoDate: string | null) {
    if (!isoDate) return "";
    return isoDate.slice(0, 16);
}

// Formats a Date using its local time (not UTC) into the same
// "YYYY-MM-DDTHH:mm" shape <input type="datetime-local"> expects --
// used when we calculate a new end time ourselves, rather than just
// displaying one that already came from the server.
function toDatetimeLocalFromDate(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditExamPage() {
    const params = useParams();
    const examId = params.id as string;

    const [exam, setExam] = useState<ExamData | null>(null);
    const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [saving, setSaving] = useState(false);

    // Whenever the start time is picked, push the end time forward to
    // match it automatically, based on whatever duration is set.
    const handleStartsAtChange = (value: string) => {
        setStartsAt(value);

        if (value) {
            const start = new Date(value);
            const end = new Date(start.getTime() + durationMinutes * 60000);
            setEndsAt(toDatetimeLocalFromDate(end));
        }
    };

    // Same idea, but the other direction: if a start time is already
    // set and the teacher changes the duration afterwards, keep the end
    // time in sync instead of leaving it stale.
    const handleDurationChange = (minutes: number) => {
        setDurationMinutes(minutes);

        if (startsAt) {
            const start = new Date(startsAt);
            const end = new Date(start.getTime() + minutes * 60000);
            setEndsAt(toDatetimeLocalFromDate(end));
        }
    };

    const loadExam = async () => {
        const response = await fetch(`/api/exams/${examId}`);
        const data = await response.json();

        if (!response.ok) {
            setError(data.error || "Failed to load exam");
            return;
        }

        setExam(data.exam);
        setTitle(data.exam.title);
        setDescription(data.exam.description || "");
        setDurationMinutes(data.exam.durationMinutes);
        setStartsAt(toDatetimeLocal(data.exam.startsAt));
        setEndsAt(toDatetimeLocal(data.exam.endsAt));
    };

    const loadBankQuestions = async () => {
        const response = await fetch("/api/questions/search?limit=1000", {
            cache: "no-store",
        });
        const data = await response.json();

        // A 404 here just means the teacher has no questions yet.
        if (response.ok) {
            setBankQuestions(data.data);
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([loadExam(), loadBankQuestions()])
            .catch((err) => {
                console.error("Error loading exam:", err);
                setError("Something went wrong. Please try again.");
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId]);

    const handleSaveInfo = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");
        setSaving(true);

        try {
            const response = await fetch(`/api/exams/update/${examId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    durationMinutes,
                    startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
                    endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not save changes");
                return;
            }

            setMessage("Saved!");
            loadExam();
        } catch (err) {
            console.error("Error saving exam:", err);
            setMessage("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        setMessage("");

        try {
            const response = await fetch(`/api/exams/${examId}/publish`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not publish exam");
                return;
            }

            loadExam();
        } catch (err) {
            console.error("Error publishing exam:", err);
            setMessage("Something went wrong. Please try again.");
        }
    };

    const handleStart = async () => {
        setMessage("");

        try {
            const response = await fetch(`/api/exams/${examId}/start`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not start exam");
                return;
            }

            loadExam();
        } catch (err) {
            console.error("Error starting exam:", err);
            setMessage("Something went wrong. Please try again.");
        }
    };

    const handleEnd = async () => {
        if (!confirm("End this exam now? Any student still in progress will be auto-submitted immediately.")) {
            return;
        }

        setMessage("");

        try {
            const response = await fetch(`/api/exams/${examId}/end`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not end exam");
                return;
            }

            loadExam();
        } catch (err) {
            console.error("Error ending exam:", err);
            setMessage("Something went wrong. Please try again.");
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setMessage(`${label} copied to clipboard.`);
    };

    const handleRegenerateCode = async () => {
        if (!confirm("Generate a new code? The old code will stop working immediately.")) return;

        setMessage("");

        try {
            const response = await fetch(`/api/exams/${examId}/regenerate-code`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not regenerate code");
                return;
            }

            loadExam();
        } catch (err) {
            console.error("Error regenerating exam code:", err);
            setMessage("Something went wrong. Please try again.");
        }
    };

    const handleAddQuestion = async (questionId: string) => {
        try {
            const response = await fetch("/api/exam-questions/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId, quesId: questionId }),
            });

            if (response.ok) {
                loadExam();
            }
        } catch (err) {
            console.error("Error adding question:", err);
        }
    };

    const handleRemoveQuestion = async (examQuestionId: string) => {
        try {
            const response = await fetch("/api/exam-questions/remove", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examQuestionId }),
            });

            if (response.ok) {
                loadExam();
            }
        } catch (err) {
            console.error("Error removing question:", err);
        }
    };

    if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!exam) return null;

    const attachedQuestionIds = exam.questions.map((q) => q.question.id);
    const availableQuestions = bankQuestions.filter((q) => !attachedQuestionIds.includes(q.id));

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
                <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                    {exam.status}
                </span>
            </div>

            {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}

            <div className="mt-6 flex max-w-md flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Share with students</p>

                <div>
                    <label className="text-xs font-medium text-slate-500">Exam link</label>
                    <div className="mt-1 flex gap-2">
                        <input
                            readOnly
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/student/exams/${examId}`}
                            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                handleCopy(`${window.location.origin}/student/exams/${examId}`, "Link")
                            }
                            className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Copy
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-500">
                        Exam code (share this separately -- students need it to start)
                    </label>
                    <div className="mt-1 flex gap-2">
                        <input
                            readOnly
                            value={exam.accessCode || ""}
                            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => exam.accessCode && handleCopy(exam.accessCode, "Code")}
                            className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Copy
                        </button>
                        <button
                            type="button"
                            onClick={handleRegenerateCode}
                            className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Regenerate
                        </button>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSaveInfo} className="mt-6 flex max-w-md flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Exam details</p>

                <label className="text-sm font-medium text-slate-700">
                    Title
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Description
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Duration (minutes)
                    <input
                        type="number"
                        required
                        min={1}
                        value={durationMinutes}
                        onChange={(e) => handleDurationChange(Number(e.target.value))}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Starts at
                    <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => handleStartsAtChange(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Ends at
                    <input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                    {saving ? "Saving..." : "Save changes"}
                </button>

                {exam.status === "draft" && (
                    <button
                        type="button"
                        onClick={handlePublish}
                        className="rounded-md border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                    >
                        Publish exam
                    </button>
                )}

                {exam.status === "published" && (
                    <button
                        type="button"
                        onClick={handleStart}
                        className="rounded-md border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                    >
                        Start exam
                    </button>
                )}

                {exam.status === "ongoing" && (
                    <button
                        type="button"
                        onClick={handleEnd}
                        className="rounded-md border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                        End exam now
                    </button>
                )}

                {exam.status === "completed" && (
                    <p className="text-sm text-slate-500">This exam has ended.</p>
                )}
            </form>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Questions in this exam ({exam.questions.length})
                    </h2>
                    <div className="mt-3 flex flex-col gap-2">
                        {exam.questions.map((attached) => (
                            <div key={attached.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                                <span className="text-sm text-slate-700">{attached.question.questionText}</span>
                                <button
                                    onClick={() => handleRemoveQuestion(attached.id)}
                                    className="text-xs font-medium text-red-600 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        {exam.questions.length === 0 && (
                            <p className="text-sm text-slate-500">No questions added yet.</p>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Your question bank</h2>
                    <div className="mt-3 flex flex-col gap-2">
                        {availableQuestions.map((question) => (
                            <div key={question.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                                <span className="text-sm text-slate-700">{question.questionText}</span>
                                <button
                                    onClick={() => handleAddQuestion(question.id)}
                                    className="text-xs font-medium text-blue-700 hover:underline"
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                        {availableQuestions.length === 0 && (
                            <p className="text-sm text-slate-500">No more questions available.</p>
                        )}
                    </div>
                    <Link href="/teacher/questions" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
                        + Create a new question
                    </Link>
                </div>
            </div>
        </div>
    );
}
