// Form to create a new exam. A new exam always starts as a draft
// with no questions — after creating it, the teacher is sent to the
// edit page to add questions and (later) publish it.

"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Classroom = {
    id: string;
    name: string;
};

type BankQuestion = {
    id: string;
    questionText: string;
    marks: number;
    type: string;
};

export default function NewExamPage() {
    const router = useRouter();

    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [classroomId, setClassroomId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [totalMarks, setTotalMarks] = useState(10);
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
                return;
            }

            router.push(`/teacher/exams/${data.exam.id}/edit`);
        } catch (err) {
            console.error("Error creating exam:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-slate-500">Loading...</p>;
    }

    if (classrooms.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                You need a classroom before creating an exam. Create one from the Classrooms page first.
            </p>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">New Exam</h1>

            <form onSubmit={handleCreate} className="mt-6 flex max-w-md flex-col gap-3">
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <label className="text-sm font-medium text-slate-700">
                    Classroom
                    <select
                        required
                        value={classroomId}
                        onChange={(e) => setClassroomId(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    >
                        {classrooms.map((classroom) => (
                            <option key={classroom.id} value={classroom.id}>
                                {classroom.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Title
                    <input
                        type="text"
                        required
                        minLength={3}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Description (optional)
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
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Total marks
                    <input
                        type="number"
                        required
                        min={1}
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(Number(e.target.value))}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </label>

                <fieldset className="mt-2 rounded-md border border-slate-200 p-3">
                    <legend className="px-1 text-sm font-semibold text-slate-700">
                        Add questions from your question bank
                    </legend>
                    {bankQuestions.length === 0 ? (
                        <p className="text-sm text-slate-500">No questions in your question bank yet.</p>
                    ) : (
                        <div className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto">
                            {bankQuestions.map((question) => (
                                <label
                                    key={question.id}
                                    className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-100 p-2 text-sm hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestionIds.includes(question.id)}
                                        onChange={(event) => {
                                            setSelectedQuestionIds((current) =>
                                                event.target.checked
                                                    ? [...current, question.id]
                                                    : current.filter((id) => id !== question.id)
                                            );
                                        }}
                                        className="mt-0.5"
                                    />
                                    <span className="min-w-0 flex-1 text-slate-700">
                                        {question.questionText}
                                        <span className="ml-2 text-xs text-slate-500">
                                            {question.type} · {question.marks} mark{question.marks === 1 ? "" : "s"}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                        {selectedQuestionIds.length} question{selectedQuestionIds.length === 1 ? "" : "s"} selected
                    </p>
                </fieldset>

                <button
                    type="submit"
                    disabled={creating}
                    className="mt-2 rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                    {creating ? "Creating..." : "Create exam"}
                </button>
            </form>
        </div>
    );
}
