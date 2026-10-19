// Lists every exam the teacher has created, with its status.
// Draft exams can be published from here; any exam can be deleted.

"use client"

import { useEffect, useState } from "react";
import { toast } from "sonner";
import PageSkeleton from "@/components/page-skeleton";
import Link from "next/link";

type Exam = {
    id: string;
    title: string;
    status: string;
    classroom: { id: string; name: string };
};

export default function TeacherExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionMessage, setActionMessage] = useState("");

    const loadExams = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/exams/get-exams");
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load exams");
                return;
            }

            setExams(data.exams);
        } catch (err) {
            console.error("Error loading exams:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExams();
    }, []);

    const handlePublish = async (examId: string) => {
        setActionMessage("");

        try {
            const response = await fetch(`/api/exams/${examId}/publish`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                setActionMessage(data.error || "Could not publish exam");
                toast.error(data.error || "Could not publish exam");
                return;
            }

            toast.success("Exam published");

            loadExams();
        } catch (err) {
            console.error("Error publishing exam:", err);
            setActionMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleStart = async (examId: string) => {
        setActionMessage("");

        try {
            const response = await fetch(`/api/exams/${examId}/start`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                setActionMessage(data.error || "Could not start exam");
                toast.error(data.error || "Could not start exam");
                return;
            }

            toast.success("Exam started");

            loadExams();
        } catch (err) {
            console.error("Error starting exam:", err);
            setActionMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleEnd = async (examId: string) => {
        if (!confirm("End this exam now? Any student still in progress will be auto-submitted immediately.")) {
            return;
        }

        setActionMessage("");

        try {
            const response = await fetch(`/api/exams/${examId}/end`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                setActionMessage(data.error || "Could not end exam");
                toast.error(data.error || "Could not end exam");
                return;
            }

            toast.success("Exam ended");

            loadExams();
        } catch (err) {
            console.error("Error ending exam:", err);
            setActionMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleDelete = async (examId: string) => {
        if (!confirm("Delete this exam? This cannot be undone.")) return;

        try {
            const response = await fetch(`/api/exams/delete/${examId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                toast.error("Could not delete exam");
                return;
            }

            toast.success("Exam deleted");
            loadExams();
        } catch (err) {
            console.error("Error deleting exam:", err);
            toast.error("Something went wrong. Please try again.");
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">My Exams</h1>
                <Link
                    href="/teacher/exams/new"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/80"
                >
                    + New exam
                </Link>
            </div>

            {actionMessage && <p className="mt-3 text-sm text-destructive">{actionMessage}</p>}

            <div className="mt-6">
                {loading && <PageSkeleton />}
                {error && <p className="text-sm text-destructive">{error}</p>}

                {!loading && !error && exams.length === 0 && (
                    <p className="text-sm text-muted-foreground">You haven&apos;t created any exam yet.</p>
                )}

                <div className="mt-4 flex flex-col gap-3">
                    {exams.map((exam) => (
                        <div key={exam.id} className="flex items-center justify-between rounded-md border border-border bg-card p-4">
                            <div>
                                <p className="font-semibold text-foreground">{exam.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {exam.classroom.name} · <span className="capitalize">{exam.status}</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <Link href={`/teacher/exams/${exam.id}/edit`} className="font-medium text-primary hover:underline">
                                    Edit
                                </Link>
                                <Link href={`/teacher/exams/${exam.id}/results`} className="font-medium text-primary hover:underline">
                                    Results
                                </Link>
                                {exam.status === "draft" && (
                                    <button
                                        onClick={() => handlePublish(exam.id)}
                                        className="font-medium text-green-700 dark:text-green-400 hover:underline"
                                    >
                                        Publish
                                    </button>
                                )}
                                {exam.status === "published" && (
                                    <button
                                        onClick={() => handleStart(exam.id)}
                                        className="font-medium text-green-700 dark:text-green-400 hover:underline"
                                    >
                                        Start
                                    </button>
                                )}
                                {exam.status === "ongoing" && (
                                    <button
                                        onClick={() => handleEnd(exam.id)}
                                        className="font-medium text-destructive hover:underline"
                                    >
                                        End now
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(exam.id)}
                                    className="font-medium text-destructive hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
