// Lists the teacher's classrooms (with each one's average score and
// pass rate). The cards come first; the "New classroom" button opens the
// create form in a dialog.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Copy, FileText, MoreHorizontal, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/page-header";
import RelativeDate from "@/components/relative-date";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
    lastActiveAt: string;
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
    const [dialogOpen, setDialogOpen] = useState(false);

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
                toast.error(data.error || "Could not create classroom");
                return;
            }

            toast.success(`Classroom created! Join code: ${data.classroom.joinCode}`);

            // close the dialog and clear the form for next time
            setDialogOpen(false);
            setName("");
            setSubject("");
            setDescription("");
            loadClassrooms();
        } catch (err) {
            console.error("Error creating classroom:", err);
            setCreateMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
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
            <PageHeader
                title="My Classrooms"
                description="Click a classroom to see its students, exams and announcements."
                actions={
                /* "New classroom" opens the create form in a dialog */
                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        setDialogOpen(open);
                        setCreateMessage("");
                    }}
                >
                    <DialogTrigger render={<Button />}>
                        <Plus /> New classroom
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create a classroom</DialogTitle>
                            <DialogDescription>
                                Students join with the code you get after creating it.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreate} className="flex flex-col gap-3">
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

                            {createMessage && <p className="text-sm text-destructive">{createMessage}</p>}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={creating}>
                                    {creating ? "Creating..." : "Create classroom"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                }
            />

            <div>
                {loading && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-40 rounded-xl" />
                        <Skeleton className="h-40 rounded-xl" />
                        <Skeleton className="h-40 rounded-xl" />
                    </div>
                )}
                {error && <ErrorState message={error} onRetry={loadClassrooms} />}

                {!loading && !error && classrooms.length === 0 && (
                    <EmptyState
                        icon={Building2}
                        title="No classrooms yet"
                        description="Click “New classroom” to create your first one."
                    />
                )}

                {/* 1 column on phones, 2 on tablets, 3 on desktop */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {classrooms.map((classroom) => (
                        // The whole card is clickable: the title link is stretched over
                        // the card with after:absolute after:inset-0. The ⋯ menu sits
                        // above it (relative z-10) so it can still be clicked on its own.
                        <Card
                            key={classroom.classroomId}
                            className="relative transition hover:bg-muted/50 hover:shadow-md hover:ring-primary/40"
                        >
                            <CardContent className="flex h-full flex-col">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <Link
                                            href={`/teacher/classrooms/${classroom.classroomId}`}
                                            className="font-semibold after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                                        >
                                            {classroom.classroomName}
                                        </Link>
                                        <p className="truncate text-sm text-muted-foreground">{classroom.subject || "No subject"}</p>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="More actions"
                                                    className="relative z-10 -mr-2 -mt-1"
                                                />
                                            }
                                        >
                                            <MoreHorizontal />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    navigator.clipboard.writeText(classroom.joinCode);
                                                    toast.success("Join code copied");
                                                }}
                                            >
                                                <Copy /> Copy join code
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(classroom.classroomId)}>
                                                <Trash2 /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    <span className="flex items-center gap-1.5">
                                        <Users className="size-4 text-muted-foreground" />
                                        {classroom.totalStudents} student{classroom.totalStudents === 1 ? "" : "s"}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <FileText className="size-4 text-muted-foreground" />
                                        {classroom.totalExams} exam{classroom.totalExams === 1 ? "" : "s"}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
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
                                </div>

                                <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted-foreground">
                                    <span>
                                        Code: <span className="font-mono font-medium text-foreground">{classroom.joinCode}</span>
                                    </span>
                                    <span>
                                        Active <RelativeDate date={classroom.lastActiveAt} />
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
