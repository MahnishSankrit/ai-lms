// Form to create a new exam. A new exam always starts as a draft.
// Left column: exam details. Right column: list of question banks —
// click a bank to open it and pick its questions (several banks can be
// open at once). When questions are selected, total marks = sum of their marks.
// After creating it, the teacher is sent to the edit page.

"use client"

import { useEffect, useState } from "react";
import PageSkeleton from "@/components/page-skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Classroom = {
    id: string;
    name: string;
};

type BankQuestion = {
    id: string;
    questionText: string;
    marks: number;
    type: string;
    bankName: string | null;
};

const UNCATEGORIZED = "Uncategorized";

const inputClass =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";

export default function NewExamPage() {
    const router = useRouter();

    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [openBanks, setOpenBanks] = useState<string[]>([]);
    const [bankSearch, setBankSearch] = useState("");
    const [classroomId, setClassroomId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [manualTotalMarks, setManualTotalMarks] = useState(10);
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/classrooms/get-classrooms").then((response) => response.json()),
            fetch("/api/questions/search?limit=1000", { cache: "no-store" }).then((response) => response.json()),
        ])
            .then(([classroomData, questionData]) => {
                if (classroomData.classrooms) {
                    setClassrooms(classroomData.classrooms);
                    if (classroomData.classrooms.length > 0) {
                        setClassroomId(classroomData.classrooms[0].id);
                    }
                }
                if (questionData.data) {
                    setBankQuestions(questionData.data);
                }
            })
            .catch((err) => {
                console.error("Error loading exam creation data:", err);
                setError("Could not load classrooms or question bank.");
            })
            .finally(() => setLoading(false));
    }, []);

    // Sum the marks of every selected question
    let selectedMarks = 0;
    for (const question of bankQuestions) {
        if (selectedQuestionIds.includes(question.id)) {
            selectedMarks += question.marks;
        }
    }

    // If questions are selected, marks come from them; otherwise the teacher types it
    const hasSelection = selectedQuestionIds.length > 0;
    const totalMarks = hasSelection ? selectedMarks : manualTotalMarks;

    // Group the questions by bank name: { "Core CS - Set 1": [...], ... }
    const questionsByBank: Record<string, BankQuestion[]> = {};
    for (const question of bankQuestions) {
        const name = question.bankName || UNCATEGORIZED;
        if (!questionsByBank[name]) {
            questionsByBank[name] = [];
        }
        questionsByBank[name].push(question);
    }

    // Bank names, A-Z, with "Uncategorized" last, filtered by the search box
    const bankNames = Object.keys(questionsByBank)
        .sort((a, b) => {
            if (a === UNCATEGORIZED) return 1;
            if (b === UNCATEGORIZED) return -1;
            return a.localeCompare(b);
        })
        .filter((name) => name.toLowerCase().includes(bankSearch.toLowerCase()));

    const toggleBankOpen = (name: string) => {
        if (openBanks.includes(name)) {
            setOpenBanks(openBanks.filter((bank) => bank !== name));
        } else {
            setOpenBanks([...openBanks, name]);
        }
    };

    // Select / unselect every question in one bank (other banks are untouched)
    const toggleSelectBank = (name: string) => {
        const idsInBank = questionsByBank[name].map((question) => question.id);
        const allInBankSelected = idsInBank.every((id) => selectedQuestionIds.includes(id));

        if (allInBankSelected) {
            setSelectedQuestionIds((current) => current.filter((id) => !idsInBank.includes(id)));
        } else {
            setSelectedQuestionIds((current) => [
                ...current,
                ...idsInBank.filter((id) => !current.includes(id)),
            ]);
        }
    };

    const toggleQuestion = (questionId: string, checked: boolean) => {
        if (checked) {
            setSelectedQuestionIds((current) => [...current, questionId]);
        } else {
            setSelectedQuestionIds((current) => current.filter((id) => id !== questionId));
        }
    };

    const handleCreate = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setCreating(true);

        try {
            const response = await fetch("/api/exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classroomId,
                    title,
                    description,
                    durationMinutes,
                    totalMarks,
                    shuffleQuestions: false,
                    shuffleOptions: false,
                    fullscreenRequired: false,
                    questionIds: selectedQuestionIds,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Could not create exam");
                toast.error(data.error || "Could not create exam");
                return;
            }

            toast.success("Exam created as a draft");
            router.push(`/teacher/exams/${data.exam.id}/edit`);
        } catch (err) {
            console.error("Error creating exam:", err);
            setError("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return <PageSkeleton />;
    }

    if (classrooms.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                You need a classroom before creating an exam. Create one from the Classrooms page first.
            </p>
        );
    }

    return (
        <div className="w-full">
            <h1 className="text-2xl font-bold tracking-tight">New Exam</h1>

            <form onSubmit={handleCreate} className="mt-6 grid w-full gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                {/* Left column: exam details */}
                <section className="flex flex-col gap-4 rounded-lg border border-border p-5 lg:self-start">
                    <h2 className="text-base font-semibold text-foreground">Exam details</h2>

                    {error && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <label className="text-sm font-medium text-foreground">
                        Classroom
                        <select
                            required
                            value={classroomId}
                            onChange={(e) => setClassroomId(e.target.value)}
                            className={inputClass}
                        >
                            {classrooms.map((classroom) => (
                                <option key={classroom.id} value={classroom.id}>
                                    {classroom.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-sm font-medium text-foreground">
                        Title
                        <input
                            type="text"
                            required
                            minLength={3}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={inputClass}
                        />
                    </label>

                    <label className="text-sm font-medium text-foreground">
                        Description (optional)
                        <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={inputClass}
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="text-sm font-medium text-foreground">
                            Duration (minutes)
                            <input
                                type="number"
                                required
                                min={1}
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                className={inputClass}
                            />
                        </label>

                        <label className="text-sm font-medium text-foreground">
                            Total marks
                            <input
                                type="number"
                                required
                                min={1}
                                value={totalMarks}
                                readOnly={hasSelection}
                                onChange={(e) => setManualTotalMarks(Number(e.target.value))}
                                className={`${inputClass} ${hasSelection ? "cursor-not-allowed bg-muted" : ""}`}
                            />
                        </label>
                    </div>
                    {hasSelection && (
                        <p className="-mt-2 text-xs text-muted-foreground">
                            Calculated from the selected questions.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={creating}
                        className="mt-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
                    >
                        {creating ? "Creating..." : "Create exam"}
                    </button>
                </section>

                {/* Right column: question bank picker */}
                <section className="flex flex-col rounded-lg border border-border p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-foreground">
                            Add questions from your question bank
                        </h2>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                            {selectedQuestionIds.length} selected · {selectedMarks} mark{selectedMarks === 1 ? "" : "s"}
                        </span>
                    </div>

                    {bankQuestions.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">No questions in your question bank yet.</p>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="Search question banks..."
                                value={bankSearch}
                                onChange={(e) => setBankSearch(e.target.value)}
                                className={`${inputClass} mt-4`}
                            />

                            <div className="mt-3 flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
                                {bankNames.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No banks match your search.</p>
                                )}

                                {bankNames.map((name) => {
                                    const questionsInBank = questionsByBank[name];
                                    const selectedInBank = questionsInBank.filter((question) =>
                                        selectedQuestionIds.includes(question.id)
                                    ).length;
                                    const allInBankSelected = selectedInBank === questionsInBank.length;
                                    const isOpen = openBanks.includes(name);

                                    return (
                                        <div key={name} className="rounded-md border border-border">
                                            {/* Bank header: click to open/close */}
                                            <button
                                                type="button"
                                                onClick={() => toggleBankOpen(name)}
                                                className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted"
                                            >
                                                <span className="font-medium text-foreground">
                                                    {isOpen ? "▾" : "▸"} {name}
                                                </span>
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {selectedInBank} / {questionsInBank.length} selected
                                                </span>
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-border p-3">
                                                    <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm font-medium text-foreground">
                                                        <input
                                                            type="checkbox"
                                                            checked={allInBankSelected}
                                                            onChange={() => toggleSelectBank(name)}
                                                        />
                                                        Select all in this bank ({questionsInBank.length})
                                                    </label>

                                                    <div className="flex flex-col gap-2">
                                                        {questionsInBank.map((question) => (
                                                            <label
                                                                key={question.id}
                                                                className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedQuestionIds.includes(question.id)}
                                                                    onChange={(event) => toggleQuestion(question.id, event.target.checked)}
                                                                    className="mt-0.5"
                                                                />
                                                                <span className="min-w-0 flex-1 text-foreground">{question.questionText}</span>
                                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                                    {question.type} · {question.marks} mark{question.marks === 1 ? "" : "s"}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>
            </form>
        </div>
    );
}
