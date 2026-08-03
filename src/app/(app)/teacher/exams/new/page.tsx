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

export default function NewExamPage() {
    const router = useRouter();

    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [classroomId, setClassroomId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [totalMarks, setTotalMarks] = useState(10);
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetch("/api/classrooms/get-classrooms")
            .then((response) => response.json())
            .then((data) => {
                if (data.classrooms) {
                    setClassrooms(data.classrooms);
                    if (data.classrooms.length > 0) {
                        setClassroomId(data.classrooms[0].id);
                    }
                }
            })
            .catch((err) => console.error("Error loading classrooms:", err));
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
