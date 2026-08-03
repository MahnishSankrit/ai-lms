// Question bank: a searchable/filterable table of every question the
// teacher has created, a dialog to create a new one, and a link out to
// the AI generator for bulk creation.

"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type Option = {
    optionText: string;
    isCorrect: boolean;
};

type Question = {
    id: string;
    questionText: string;
    type: string;
    marks: number;
    difficulty: string | null;
    options: { id: string; optionText: string; isCorrect: boolean }[];
};

const EMPTY_OPTIONS: Option[] = [
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
];

function difficultyVariant(difficulty: string | null) {
    if (!difficulty) return "outline" as const;
    const value = difficulty.toLowerCase();
    if (value === "easy") return "secondary" as const;
    if (value === "hard") return "destructive" as const;
    return "default" as const; // medium / anything else
}

export default function TeacherQuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [dialogOpen, setDialogOpen] = useState(false);
    // null = creating a new question; otherwise the id of the question being edited.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [questionText, setQuestionText] = useState("");
    const [type, setType] = useState("mcq");
    const [marks, setMarks] = useState(1);
    const [difficulty, setDifficulty] = useState("Medium");
    const [options, setOptions] = useState<Option[]>(EMPTY_OPTIONS);
    const [saving, setSaving] = useState(false);

    const loadQuestions = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`/api/questions/get-questions?page=${page}&limit=10`);
            const data = await response.json();

            // A 404 here just means there are no questions yet.
            if (response.status === 404) {
                setQuestions([]);
                return;
            }

            if (!response.ok) {
                setError(data.error || "Failed to load questions");
                return;
            }

            setQuestions(data.questions);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error("Error loading questions:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const visibleQuestions = useMemo(() => {
        return questions.filter((question) => {
            const matchesSearch = question.questionText.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === "all" || question.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [questions, search, typeFilter]);

    const resetForm = () => {
        setQuestionText("");
        setMarks(1);
        setDifficulty("Medium");
        setOptions(EMPTY_OPTIONS);
    };

    const openCreateDialog = () => {
        setEditingId(null);
        resetForm();
        setDialogOpen(true);
    };

    const openEditDialog = (question: Question) => {
        setEditingId(question.id);
        setQuestionText(question.questionText);
        setType(question.type);
        setMarks(question.marks);
        setDifficulty(question.difficulty || "Medium");
        setOptions(question.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect })));
        setDialogOpen(true);
    };

    const handleOptionTextChange = (index: number, value: string) => {
        const updated = [...options];
        updated[index] = { ...updated[index], optionText: value };
        setOptions(updated);
    };

    const handleOptionCorrectChange = (index: number, checked: boolean) => {
        const updated = [...options];
        updated[index] = { ...updated[index], isCorrect: checked };
        setOptions(updated);
    };

    const addOptionRow = () => {
        setOptions([...options, { optionText: "", isCorrect: false }]);
    };

    const removeOptionRow = (index: number) => {
        if (options.length <= 2) return; // the API requires at least 2 options
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const isEditing = editingId !== null;
        const url = isEditing ? `/api/questions/${editingId}/update` : "/api/questions";
        const method = isEditing ? "PATCH" : "POST";

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionText, type, marks, difficulty, options }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || `Could not ${isEditing ? "update" : "create"} question`);
                return;
            }

            toast.success(isEditing ? "Question updated" : "Question created");
            resetForm();
            setDialogOpen(false);
            loadQuestions();
        } catch (err) {
            console.error("Error saving question:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (questionId: string) => {
        if (!confirm("Delete this question? This cannot be undone.")) return;

        try {
            const response = await fetch(`/api/questions/${questionId}/delete`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("Question deleted");
                loadQuestions();
            }
        } catch (err) {
            console.error("Error deleting question:", err);
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast("Bulk import isn't wired up yet.")}>
                        <Upload /> Import
                    </Button>
                    <Button variant="outline" size="sm" render={<Link href="/teacher/ai" />}>
                        <Sparkles /> AI Generate
                    </Button>

                    <Button size="sm" onClick={openCreateDialog}>
                        <Plus /> Create Question
                    </Button>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{editingId ? "Edit question" : "Create a question"}</DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <Textarea
                                    placeholder="Question text"
                                    required
                                    minLength={5}
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                />

                                <div className="flex gap-3">
                                    <Select value={type} onValueChange={(value) => setType(value ?? "mcq")}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mcq">Multiple choice</SelectItem>
                                            <SelectItem value="multiple_select">Multiple select</SelectItem>
                                            <SelectItem value="true_false">True / False</SelectItem>
                                            <SelectItem value="short_answer">Short answer</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={difficulty} onValueChange={(value) => setDifficulty(value ?? "Medium")}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Easy">Easy</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Input
                                        type="number"
                                        min={1}
                                        required
                                        value={marks}
                                        onChange={(e) => setMarks(Number(e.target.value))}
                                        placeholder="Marks"
                                        className="w-20"
                                    />
                                </div>

                                <p className="text-sm font-medium">Options (check the correct one(s))</p>
                                {options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Checkbox
                                            checked={option.isCorrect}
                                            onCheckedChange={(checked) => handleOptionCorrectChange(index, checked === true)}
                                        />
                                        <Input
                                            required
                                            placeholder={`Option ${index + 1}`}
                                            value={option.optionText}
                                            onChange={(e) => handleOptionTextChange(index, e.target.value)}
                                        />
                                        {options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeOptionRow(index)}
                                                className="text-xs text-destructive hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addOptionRow} className="self-start text-xs font-medium text-primary hover:underline">
                                    + Add option
                                </button>

                                <DialogFooter>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? "Saving..." : editingId ? "Save changes" : "Create question"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <Input
                    placeholder="Search questions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                />
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? "all")}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="mcq">Multiple choice</SelectItem>
                        <SelectItem value="multiple_select">Multiple select</SelectItem>
                        <SelectItem value="true_false">True / False</SelectItem>
                        <SelectItem value="short_answer">Short answer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="mt-4">
                {loading && <Skeleton className="h-64 w-full rounded-xl" />}
                {error && <ErrorState message={error} onRetry={loadQuestions} />}

                {!loading && !error && visibleQuestions.length === 0 && (
                    <EmptyState
                        icon={BookOpen}
                        title="No questions found"
                        description="Create one manually, or generate a batch with AI."
                    />
                )}

                {!loading && !error && visibleQuestions.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Question</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead>Marks</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleQuestions.map((question) => (
                                <TableRow key={question.id}>
                                    <TableCell className="max-w-md truncate">{question.questionText}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {question.type.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={difficultyVariant(question.difficulty)}>
                                            {question.difficulty || "—"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{question.marks}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(question)}>
                                            <Pencil />
                                        </Button>
                                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(question.id)}>
                                            <Trash2 className="text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {!loading && !error && totalPages > 1 && (
                    <div className="mt-4 flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
