// Edit page for one exam.
//
// Three things happen here:
// 1. Edit the exam's basic info (title, description, duration, start/end time).
// 2. Manage which questions are attached to this exam (add from your
//    question bank, or remove ones already attached).
// 3. Publish the exam once it has questions and a start/end time.

"use client"

import { useEffect, useState } from "react";
import { toast } from "sonner";
import PageSkeleton from "@/components/page-skeleton";
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
    bankName: string | null;
    options: Option[];
};

// How many questions to show per page in each list
const PAGE_SIZE = 10;

const inputClass =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";

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

    // Search + page number for each of the two question lists
    const [examSearch, setExamSearch] = useState("");
    const [examPage, setExamPage] = useState(1);
    const [bankSearch, setBankSearch] = useState("");
    const [bankFilter, setBankFilter] = useState("all");
    const [bankPage, setBankPage] = useState(1);

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
                toast.error(data.error || "Could not save changes");
                return;
            }

            toast.success("Exam saved");

            setMessage("Saved!");
            loadExam();
        } catch (err) {
            console.error("Error saving exam:", err);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
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
                toast.error(data.error || "Could not publish exam");
                return;
            }

            toast.success("Exam published");

            loadExam();
        } catch (err) {
            console.error("Error publishing exam:", err);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
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
                toast.error(data.error || "Could not start exam");
                return;
            }

            toast.success("Exam started");

            loadExam();
        } catch (err) {
            console.error("Error starting exam:", err);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
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
                toast.error(data.error || "Could not end exam");
                return;
            }

            toast.success("Exam ended");

            loadExam();
        } catch (err) {
            console.error("Error ending exam:", err);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
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
                toast.error(data.error || "Could not regenerate code");
                return;
            }

            toast.success("New exam code generated");

            loadExam();
        } catch (err) {
            console.error("Error regenerating exam code:", err);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleAddQuestion = async (questionId: string) => {
        try {
            const response = await fetch("/api/exam-questions/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId, quesId: questionId }),
            });

            if (!response.ok) {
                toast.error("Could not add question");
                return;
            }

            toast.success("Question added to exam");
            loadExam();
        } catch (err) {
            console.error("Error adding question:", err);
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleRemoveQuestion = async (examQuestionId: string) => {
        try {
            const response = await fetch("/api/exam-questions/remove", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examQuestionId }),
            });

            if (!response.ok) {
                toast.error("Could not remove question");
                return;
            }

            toast.success("Question removed from exam");
            loadExam();
        } catch (err) {
            console.error("Error removing question:", err);
        }
    };

    if (loading) return <PageSkeleton />;
    if (error) return <p className="text-sm text-destructive">{error}</p>;
    if (!exam) return null;

    const attachedQuestionIds = exam.questions.map((q) => q.question.id);
    const availableQuestions = bankQuestions.filter((q) => !attachedQuestionIds.includes(q.id));

    let examTotalMarks = 0;
    for (const attached of exam.questions) {
        examTotalMarks += attached.question.marks;
    }

    // Bank names for the filter dropdown (null bank = "Uncategorized")
    const bankNames: string[] = [];
    for (const question of bankQuestions) {
        const name = question.bankName || "Uncategorized";
        if (!bankNames.includes(name)) {
            bankNames.push(name);
        }
    }
    bankNames.sort();

    // Left list: questions in this exam, filtered by search, then cut to one page
    const filteredExamQuestions = exam.questions.filter((attached) =>
        attached.question.questionText.toLowerCase().includes(examSearch.toLowerCase())
    );
    const examTotalPages = Math.max(1, Math.ceil(filteredExamQuestions.length / PAGE_SIZE));
    const safeExamPage = Math.min(examPage, examTotalPages);
    const examPageItems = filteredExamQuestions.slice((safeExamPage - 1) * PAGE_SIZE, safeExamPage * PAGE_SIZE);

    // Right list: bank questions not yet in the exam, filtered by bank + search, then one page
    const filteredBankQuestions = availableQuestions.filter((question) => {
        const name = question.bankName || "Uncategorized";
        if (bankFilter !== "all" && name !== bankFilter) return false;
        return question.questionText.toLowerCase().includes(bankSearch.toLowerCase());
    });
    const bankTotalPages = Math.max(1, Math.ceil(filteredBankQuestions.length / PAGE_SIZE));
    const safeBankPage = Math.min(bankPage, bankTotalPages);
    const bankPageItems = filteredBankQuestions.slice((safeBankPage - 1) * PAGE_SIZE, safeBankPage * PAGE_SIZE);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {exam.questions.length} question{exam.questions.length === 1 ? "" : "s"} · {examTotalMarks} marks · {exam.durationMinutes} min
                    </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                    {exam.status}
                </span>
            </div>

            {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Exam details form */}
                <form onSubmit={handleSaveInfo} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
                    <h2 className="text-base font-semibold text-foreground">Exam details</h2>

                    <label className="text-sm font-medium text-foreground">
                        Title
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={inputClass}
                        />
                    </label>

                    <label className="text-sm font-medium text-foreground">
                        Description
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={inputClass}
                        />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="text-sm font-medium text-foreground">
                            Duration (min)
                            <input
                                type="number"
                                required
                                min={1}
                                value={durationMinutes}
                                onChange={(e) => handleDurationChange(Number(e.target.value))}
                                className={inputClass}
                            />
                        </label>

                        <label className="text-sm font-medium text-foreground">
                            Starts at
                            <input
                                type="datetime-local"
                                value={startsAt}
                                onChange={(e) => handleStartsAtChange(e.target.value)}
                                className={inputClass}
                            />
                        </label>

                        <label className="text-sm font-medium text-foreground">
                            Ends at
                            <input
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
                        >
                            {saving ? "Saving..." : "Save changes"}
                        </button>

                        {exam.status === "draft" && (
                            <button
                                type="button"
                                onClick={handlePublish}
                                className="rounded-md border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 dark:text-green-400 hover:bg-green-500/10"
                            >
                                Publish exam
                            </button>
                        )}

                        {exam.status === "published" && (
                            <button
                                type="button"
                                onClick={handleStart}
                                className="rounded-md border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 dark:text-green-400 hover:bg-green-500/10"
                            >
                                Start exam
                            </button>
                        )}

                        {exam.status === "ongoing" && (
                            <button
                                type="button"
                                onClick={handleEnd}
                                className="rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
                            >
                                End exam now
                            </button>
                        )}

                        {exam.status === "completed" && (
                            <p className="self-center text-sm text-muted-foreground">This exam has ended.</p>
                        )}
                    </div>
                </form>

                {/* Share link + access code */}
                <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 lg:self-start">
                    <h2 className="text-base font-semibold text-foreground">Share with students</h2>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Exam link</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                readOnly
                                value={`${typeof window !== "undefined" ? window.location.origin : ""}/student/exams/${examId}`}
                                className="w-full min-w-0 rounded-md border border-input bg-muted px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    handleCopy(`${window.location.origin}/student/exams/${examId}`, "Link")
                                }
                                className="shrink-0 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground">
                            Exam code (share this separately -- students need it to start)
                        </label>
                        <div className="mt-1 flex gap-2">
                            <input
                                readOnly
                                value={exam.accessCode || ""}
                                className="w-full min-w-0 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => exam.accessCode && handleCopy(exam.accessCode, "Code")}
                                className="shrink-0 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
                            >
                                Copy
                            </button>
                            <button
                                type="button"
                                onClick={handleRegenerateCode}
                                className="shrink-0 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
                            >
                                Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Questions already in the exam */}
                <section className="flex flex-col rounded-lg border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-foreground">Questions in this exam</h2>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                            {exam.questions.length} · {examTotalMarks} marks
                        </span>
                    </div>

                    <input
                        type="text"
                        placeholder="Search questions in this exam..."
                        value={examSearch}
                        onChange={(e) => {
                            setExamSearch(e.target.value);
                            setExamPage(1);
                        }}
                        className={`${inputClass} mt-4`}
                    />

                    <div className="mt-3 flex flex-col gap-2">
                        {examPageItems.map((attached, index) => (
                            <QuestionRow
                                key={attached.id}
                                number={(safeExamPage - 1) * PAGE_SIZE + index + 1}
                                question={attached.question}
                                actionLabel="Remove"
                                danger
                                onAction={() => handleRemoveQuestion(attached.id)}
                            />
                        ))}
                        {filteredExamQuestions.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {exam.questions.length === 0 ? "No questions added yet." : "No questions match your search."}
                            </p>
                        )}
                    </div>

                    <Pagination page={safeExamPage} totalPages={examTotalPages} onChange={setExamPage} />
                </section>

                {/* Question bank (questions not yet in the exam) */}
                <section className="flex flex-col rounded-lg border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-foreground">Your question bank</h2>
                        <Link href="/teacher/questions" className="text-sm font-semibold text-primary hover:underline">
                            + Create a new question
                        </Link>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <select
                            value={bankFilter}
                            onChange={(e) => {
                                setBankFilter(e.target.value);
                                setBankPage(1);
                            }}
                            className={`${inputClass} sm:w-56`}
                        >
                            <option value="all">All banks</option>
                            {bankNames.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={bankSearch}
                            onChange={(e) => {
                                setBankSearch(e.target.value);
                                setBankPage(1);
                            }}
                            className={inputClass}
                        />
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                        {bankPageItems.map((question) => (
                            <QuestionRow
                                key={question.id}
                                question={question}
                                actionLabel="Add"
                                onAction={() => handleAddQuestion(question.id)}
                            />
                        ))}
                        {filteredBankQuestions.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {availableQuestions.length === 0 ? "No more questions available." : "No questions match your filters."}
                            </p>
                        )}
                    </div>

                    <Pagination page={safeBankPage} totalPages={bankTotalPages} onChange={setBankPage} />
                </section>
            </div>
        </div>
    );
}

// One question line: optional number, the text, type/marks, and an Add/Remove button
function QuestionRow({
    number,
    question,
    actionLabel,
    danger,
    onAction,
}: {
    number?: number;
    question: BankQuestion;
    actionLabel: string;
    danger?: boolean;
    onAction: () => void;
}) {
    return (
        <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
            {number !== undefined && (
                <span className="mt-0.5 w-6 shrink-0 text-xs font-semibold text-muted-foreground">{number}.</span>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{question.questionText}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {question.type.replace("_", " ")} · {question.marks} mark{question.marks === 1 ? "" : "s"}
                    {question.bankName ? ` · ${question.bankName}` : ""}
                </p>
            </div>
            <button
                type="button"
                onClick={onAction}
                className={
                    danger
                        ? "shrink-0 rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                        : "shrink-0 rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                }
            >
                {actionLabel}
            </button>
        </div>
    );
}

// Previous / "Page X of Y" / Next. Hidden when everything fits on one page.
function Pagination({
    page,
    totalPages,
    onChange,
}: {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}) {
    if (totalPages <= 1) return null;

    return (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <button
                type="button"
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
                Previous
            </button>
            <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
            </span>
            <button
                type="button"
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
                Next
            </button>
        </div>
    );
}
