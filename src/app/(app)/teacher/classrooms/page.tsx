// Lists the teacher's classrooms and lets them create a new one.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";

type Classroom = {
    id: string;
    name: string;
    subject: string | null;
    joinCode: string;
};

export default function TeacherClassroomsPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [createMessage, setCreateMessage] = useState("");

    const loadClassrooms = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/classrooms/get-classrooms");
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load classrooms");
                return;
            }

            setClassrooms(data.classrooms);
        } catch (err) {
            console.error("Error loading classrooms:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClassrooms();
    }, []);

    const handleCreate = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCreateMessage("");
        setCreating(true);

        try {
            const response = await fetch("/api/classrooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, subject, description }),
            });

            const data = await response.json();

            if (!response.ok) {
                setCreateMessage(data.error || "Could not create classroom");
                return;
            }

            setCreateMessage(`Classroom created! Join code: ${data.classroom.joinCode}`);
            setName("");
            setSubject("");
            setDescription("");
            loadClassrooms();
        } catch (err) {
            console.error("Error creating classroom:", err);
            setCreateMessage("Something went wrong. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (classroomId: string) => {
        if (!confirm("Delete this classroom? This cannot be undone.")) return;

        try {
            const response = await fetch(`/api/classrooms/delete/${classroomId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                loadClassrooms();
            }
        } catch (err) {
            console.error("Error deleting classroom:", err);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">My Classrooms</h1>

            <form onSubmit={handleCreate} className="mt-4 flex max-w-md flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Create a classroom</p>

                <input
                    type="text"
                    placeholder="Name (e.g. Grade 10 Mathematics)"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
                <input
                    type="text"
                    placeholder="Subject (e.g. Mathematics)"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
                <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />

                <button
                    type="submit"
                    disabled={creating}
                    className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                    {creating ? "Creating..." : "Create classroom"}
                </button>

                {createMessage && <p className="text-sm text-slate-600">{createMessage}</p>}
            </form>

            <div className="mt-8">
                {loading && <p className="text-sm text-slate-500">Loading classrooms...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                {!loading && !error && classrooms.length === 0 && (
                    <p className="text-sm text-slate-500">You haven&apos;t created any classroom yet.</p>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {classrooms.map((classroom) => (
                        <div key={classroom.id} className="rounded-md border border-slate-200 bg-white p-4">
                            <Link href={`/teacher/classrooms/${classroom.id}`} className="font-semibold text-slate-900 hover:underline">
                                {classroom.name}
                            </Link>
                            <p className="text-sm text-slate-500">{classroom.subject || "No subject"}</p>
                            <p className="mt-2 text-xs text-slate-400">Join code: {classroom.joinCode}</p>

                            <button
                                onClick={() => handleDelete(classroom.id)}
                                className="mt-3 text-xs font-medium text-red-600 hover:underline"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
