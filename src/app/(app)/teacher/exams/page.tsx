// Lists every exam the teacher has created.
//
// - Tabs filter by status (All / Ongoing / Scheduled / Completed / Drafts).
// - Each row starts with a coloured status badge, then the title and key
//   details on one line (classroom · questions · duration · start/end time).
// - One visible button per row (Results, or Edit for drafts); everything
//   else (Edit, Publish/Start/End, Delete) is behind the "⋯" menu.
// - Delete asks for confirmation in a dialog first.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, MoreHorizontal, Pencil, Play, Plus, Send, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";
import PageHeader from "@/components/page-header";
import { formatIndianDateTime } from "@/lib/format-date";

type Exam = {
    id: string;
    title: string;
    status: string; // draft | published | ongoing | completed
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    durationMinutes: number;
    questionCount: number;
    classroom: { id: string; name: string };
};

// Tab value -> which exam statuses it shows ("all" shows everything).
const TABS = [
    { value: "all", label: "All" },
    { value: "ongoing", label: "Ongoing" },
    { value: "published", label: "Scheduled" },
    { value: "completed", label: "Completed" },
    { value: "draft", label: "Drafts" },
];

// Coloured status badge shown at the start of each row.
function StatusBadge({ status }: { status: string }) {
    let label = status;
    let style = "bg-muted text-muted-foreground";

    if (status === "ongoing") {
        label = "Ongoing";
        style = "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    } else if (status === "published") {
        label = "Scheduled";
        style = "bg-accent text-accent-foreground";
    } else if (status === "completed") {
        label = "Completed";
        style = "bg-secondary text-secondary-foreground";
    } else if (status === "draft") {
        label = "Draft";
        style = "bg-highlight/20 text-foreground";
    }

    return (
        <span className={`inline-flex w-24 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
            <span className="size-1.5 rounded-full bg-current" />
            {label}
        </span>
    );
}

// The time part of the details line, depending on the status.
function getTimeText(exam: Exam) {
    if (exam.status === "ongoing" && exam.endsAt) return `Ends ${formatIndianDateTime(exam.endsAt)}`;
    if (exam.status === "completed" && exam.endsAt) return `Ended ${formatIndianDateTime(exam.endsAt)}`;
    if (exam.startsAt) return `Starts ${formatIndianDateTime(exam.startsAt)}`;
    return "Not scheduled";
}

export default function TeacherExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("all");

    // the exam waiting for delete confirmation (null = dialog closed)
    const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
    const [deleting, setDeleting] = useState(false);

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

    // Publish / Start / End all work the same way: POST, toast, reload.
    const runExamAction = async (examId: string, action: "publish" | "start" | "end", successMessage: string) => {
        try {
            const response = await fetch(`/api/exams/${examId}/${action}`, { method: "POST" });
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || `Could not ${action} exam`);
                return;
            }

            toast.success(successMessage);
            loadExams();
        } catch (err) {
            console.error(`Error (${action}) exam:`, err);
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleEnd = (examId: string) => {
        if (!confirm("End this exam now? Any student still in progress will be auto-submitted immediately.")) {
            return;
        }
        runExamAction(examId, "end", "Exam ended");
    };

    // Called from the confirm dialog's "Delete exam" button.
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);

        try {
            const response = await fetch(`/api/exams/delete/${deleteTarget.id}`, { method: "DELETE" });

            if (!response.ok) {
                toast.error("Could not delete exam");
                return;
            }

            toast.success("Exam deleted");
            setDeleteTarget(null);
            loadExams();
        } catch (err) {
            console.error("Error deleting exam:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    // how many exams each tab has, shown next to the tab label
    const countFor = (tabValue: string) => {
        if (tabValue === "all") return exams.length;
        return exams.filter((exam) => exam.status === tabValue).length;
    };

    const visibleExams = tab === "all" ? exams : exams.filter((exam) => exam.status === tab);

    return (
        <div>
            <PageHeader
                title="My Exams"
                actions={
                    <Button nativeButton={false} render={<Link href="/teacher/exams/new" />}>
                        <Plus /> New exam
                    </Button>
                }
            >
                {/* status tabs; scroll sideways on small phones instead of wrapping */}
                <div className="-mx-1 overflow-x-auto px-1">
                    <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
                        <TabsList>
                            {TABS.map((t) => (
                                <TabsTrigger key={t.value} value={t.value}>
                                    {t.label}
                                    <span className="ml-1 text-xs text-muted-foreground">{countFor(t.value)}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </PageHeader>

            {loading && (
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                </div>
            )}
            {error && <ErrorState message={error} onRetry={loadExams} />}

            {!loading && !error && visibleExams.length === 0 && (
                <EmptyState
                    icon={FileText}
                    title={tab === "all" ? "No exams yet" : "No exams here"}
                    description={tab === "all" ? "Click “New exam” to create your first one." : "Try another tab."}
                />
            )}

            {!loading && !error && (
                <div className="flex flex-col gap-3">
                    {visibleExams.map((exam) => {
                        const isDraft = exam.status === "draft";

                        return (
                            <div
                                key={exam.id}
                                className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center"
                            >
                                <StatusBadge status={exam.status} />

                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{exam.title}</p>
                                    {/* key details on one line */}
                                    <p className="text-sm text-muted-foreground">
                                        {exam.classroom.name} · {exam.questionCount} Q{exam.questionCount === 1 ? "" : "s"} ·{" "}
                                        {exam.durationMinutes} min · {getTimeText(exam)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* one visible button: Edit for drafts, Results otherwise */}
                                    {isDraft ? (
                                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/teacher/exams/${exam.id}/edit`} />}>
                                            <Pencil /> Edit
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/teacher/exams/${exam.id}/results`} />}>
                                            Results
                                        </Button>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${exam.title}`} />}
                                        >
                                            <MoreHorizontal />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {!isDraft && (
                                                <DropdownMenuItem render={<Link href={`/teacher/exams/${exam.id}/edit`} />}>
                                                    <Pencil /> Edit
                                                </DropdownMenuItem>
                                            )}
                                            {isDraft && (
                                                <DropdownMenuItem onClick={() => runExamAction(exam.id, "publish", "Exam published")}>
                                                    <Send /> Publish
                                                </DropdownMenuItem>
                                            )}
                                            {exam.status === "published" && (
                                                <DropdownMenuItem onClick={() => runExamAction(exam.id, "start", "Exam started")}>
                                                    <Play /> Start now
                                                </DropdownMenuItem>
                                            )}
                                            {exam.status === "ongoing" && (
                                                <DropdownMenuItem onClick={() => handleEnd(exam.id)}>
                                                    <Square /> End now
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(exam)}>
                                                <Trash2 /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* One delete-confirmation dialog for the whole page */}
            <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently deletes the exam, its questions list and all student attempts and
                            results. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete exam"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
