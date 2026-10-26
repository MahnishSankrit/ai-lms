// Question bank: a searchable/filterable table of every question the
// teacher has created, a dialog to create a new one, a CSV export, and
// a link out to the AI generator for bulk creation.
//
// Search/filter/pagination all happen server-side via /api/questions/search
// (not by filtering whatever page happens to already be loaded), so
// searching actually searches the whole bank, not just the visible page.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Download, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";

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
    bankName: string | null;
    options: { id: string; optionText: string; isCorrect: boolean }[];
};

type Bank = {
    bankName: string | null;
    count: number;
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
    const [difficultyFilter, setDifficultyFilter] = useState("all");
    const [bankFilter, setBankFilter] = useState("all");
    const [banks, setBanks] = useState<Bank[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [exporting, setExporting] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    // null = creating a new question; otherwise the id of the question being edited.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [questionText, setQuestionText] = useState("");
    const [type, setType] = useState("mcq");
    const [marks, setMarks] = useState(1);
    const [difficulty, setDifficulty] = useState("Medium");
    const [bankName, setBankName] = useState("");
    const [options, setOptions] = useState<Option[]>(EMPTY_OPTIONS);
    const [saving, setSaving] = useState(false);

    const loadQuestions = async () => {
        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({ page: String(page), limit: "10" });
            if (search) params.set("q", search);
            if (typeFilter !== "all") params.set("type", typeFilter);
            if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter);
            if (bankFilter !== "all") params.set("bank", bankFilter);

            const response = await fetch(`/api/questions/search?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load questions");
                return;
            }

            setQuestions(data.data);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error("Error loading questions:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // List of bank names, for the filter dropdown and the name suggestions
    const loadBanks = async () => {
        try {
            const response = await fetch("/api/questions/banks", { cache: "no-store" });
            const data = await response.json();
            if (response.ok) {
                setBanks(data.banks);
            }
        } catch (err) {
            console.error("Error loading question banks:", err);
        }
    };

    useEffect(() => {
        loadBanks();
    }, []);

    // Refetch whenever the page changes immediately...
    useEffect(() => {
        loadQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // ...but debounce search/filter changes so we're not sending a request
    // on every single keystroke, and jump back to page 1 since the old
    // page number might not exist in the new filtered results.
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (page !== 1) {
                setPage(1);
            } else {
                loadQuestions();
            }
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, typeFilter, difficultyFilter, bankFilter]);

    const resetForm = () => {
        setQuestionText("");
        setMarks(1);
        setDifficulty("Medium");
        setOptions(EMPTY_OPTIONS);
        // bankName is kept on purpose, so adding many questions to the same bank is quick
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
        setBankName(question.bankName || "");
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
                body: JSON.stringify({ questionText, type, marks, difficulty, bankName, options }),
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
            loadBanks();
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

    const handleExport = async () => {
        setExporting(true);

        try {
            const response = await fetch("/api/questions/export", { method: "POST" });

            if (!response.ok) {
                const data = await response.json();
                toast.error(data.error || "Could not export questions");
                return;
            }

            // The response is a CSV file, not JSON -- turn it into a
            // downloadable link and click it.
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "questions.csv";
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error exporting questions:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                        <Download /> {exporting ? "Exporting..." : "Export CSV"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast("Bulk import isn't wired up yet.")}>
                        <Upload /> Import
                    </Button>
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/teacher/ai" />}>
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

                                {/* Type a new bank name, or pick an existing one from the suggestions */}
                                <Input
                                    placeholder="Question bank name (e.g. Core CS - Set 1)"
                                    list="bank-name-options"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                />
                                <datalist id="bank-name-options">
                                    {banks.map((bank) =>
                                        bank.bankName ? <option key={bank.bankName} value={bank.bankName} /> : null
                                    )}
                                </datalist>

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
                <Select value={difficultyFilter} onValueChange={(value) => setDifficultyFilter(value ?? "all")}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All difficulties</SelectItem>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={bankFilter} onValueChange={(value) => setBankFilter(value ?? "all")}>
                    <SelectTrigger className="w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All banks</SelectItem>
                        {banks.map((bank) => (
                            <SelectItem key={bank.bankName ?? "__none__"} value={bank.bankName ?? "__none__"}>
                                {bank.bankName ?? "Uncategorized"} ({bank.count})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="mt-4">
                {loading && <Skeleton className="h-64 w-full rounded-xl" />}
                {error && <ErrorState message={error} onRetry={loadQuestions} />}

                {!loading && !error && questions.length === 0 && (
                    <EmptyState
                        icon={BookOpen}
                        title="No questions found"
                        description="Create one manually, or generate a batch with AI."
                    />
                )}

                {!loading && !error && questions.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Question</TableHead>
                                <TableHead>Bank</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead>Marks</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions.map((question) => (
                                <TableRow key={question.id}>
                                    <TableCell className="max-w-md truncate">{question.questionText}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {question.bankName || "—"}
                                    </TableCell>
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
