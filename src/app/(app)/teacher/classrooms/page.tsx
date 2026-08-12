// Lists the teacher's classrooms (with each one's average score and
// pass rate) and lets them create a new one.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type Classroom = {
    classroomId: string;
    classroomName: string;
    subject: string | null;
    joinCode: string;
    totalStudents: number;
    totalExams: number;
    totalAttempts: number;
    averageScore: number;
    passRate: number;
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
            const response = await fetch("/api/results/classroom");
            const data = await response.json();

            // A 404 here just means the teacher has no classrooms yet.
            if (response.status === 404) {
                setClassrooms([]);
                return;
            }

            if (!response.ok) {
                setError(data.error || "Failed to load classrooms");
                return;
            }

            setClassrooms(data.results.classrooms);
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
                toast.success("Classroom deleted");
                loadClassrooms();
            }
        } catch (err) {
            console.error("Error deleting classroom:", err);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">My Classrooms</h1>

            <form onSubmit={handleCreate} className="mt-4 flex max-w-md flex-col gap-3 rounded-md border p-4">
                <p className="text-sm font-semibold">Create a classroom</p>

                <Input
                    placeholder="Name (e.g. Grade 10 Mathematics)"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Input
                    placeholder="Subject (e.g. Mathematics)"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                />
                <Textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <Button type="submit" disabled={creating} className="self-start">
                    {creating ? "Creating..." : "Create classroom"}
                </Button>

                {createMessage && <p className="text-sm text-muted-foreground">{createMessage}</p>}
            </form>

            <div className="mt-8">
                {loading && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Skeleton className="h-32 rounded-xl" />
                        <Skeleton className="h-32 rounded-xl" />
                    </div>
                )}
                {error && <ErrorState message={error} onRetry={loadClassrooms} />}

                {!loading && !error && classrooms.length === 0 && (
                    <EmptyState
                        icon={Building2}
                        title="No classrooms yet"
                        description="Create one above to get started."
                    />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    {classrooms.map((classroom) => (
                        <Card key={classroom.classroomId}>
                            <CardContent>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <Link href={`/teacher/classrooms/${classroom.classroomId}`} className="font-semibold hover:underline">
                                            {classroom.classroomName}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">{classroom.subject || "No subject"}</p>
                                    </div>
                                    <Badge variant="secondary">{classroom.totalStudents} student(s)</Badge>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Avg. score</p>
                                        <p className="font-semibold">
                                            {classroom.totalAttempts > 0 ? classroom.averageScore : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Pass rate</p>
                                        <p className="font-semibold">
                                            {classroom.totalAttempts > 0 ? `${classroom.passRate}%` : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Exams</p>
                                        <p className="font-semibold">{classroom.totalExams}</p>
                                    </div>
                                </div>

                                <p className="mt-3 text-xs text-muted-foreground">Join code: {classroom.joinCode}</p>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(classroom.classroomId)}
                                    className="mt-2 text-destructive"
                                >
                                    Delete
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
