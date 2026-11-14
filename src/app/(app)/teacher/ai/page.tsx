// AI question generator workspace.
//
// Flow (shown as a step indicator at the top):
//   1. Upload   -- drop a PDF on the big area (or click to browse); its text
//                  is extracted straight away.
//   2. Review   -- check / edit the extracted text (or paste your own).
//   3. Generate -- pick how many questions, the difficulty and the bank,
//                  then generate. Each generated question is a card with
//                  Accept and Edit; accepted ones are saved to the bank.
//
// Buttons stay clickable -- if something is missing (too little text, no
// bank name...) clicking shows a message saying what to fix, instead of the
// button just looking greyed out.

"use client"

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, FileText, Loader2, Pencil, Sparkles, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/page-header";

type GeneratedOption = {
    optionText: string;
    isCorrect: boolean;
};

type GeneratedQuestion = {
    questionText: string;
    type: string;
    marks: number;
    difficulty?: string;
    options: GeneratedOption[];
};

type Bank = { bankName: string | null; count: number };

const STEPS = ["Upload", "Review text", "Generate"];

// The 1 → 2 → 3 indicator at the top. currentStep is 1, 2 or 3.
function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <ol className="flex flex-wrap items-center gap-2 text-sm">
            {STEPS.map((label, index) => {
                const stepNumber = index + 1;
                const isDone = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;

                let circleStyle = "border-border bg-background text-muted-foreground";
                if (isDone) circleStyle = "border-primary bg-primary text-primary-foreground";
                if (isCurrent) circleStyle = "border-primary bg-background text-primary";

                return (
                    <li key={label} className="flex items-center gap-2">
                        <span className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${circleStyle}`}>
                            {isDone ? <Check className="size-3.5" /> : stepNumber}
                        </span>
                        <span className={isCurrent || isDone ? "font-medium text-foreground" : "text-muted-foreground"}>
                            {label}
                        </span>
                        {stepNumber < STEPS.length && <span className="mx-1 text-muted-foreground">→</span>}
                    </li>
                );
            })}
        </ol>
    );
}

export default function AiGeneratorPage() {
    const [file, setFile] = useState<File | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [text, setText] = useState("");

    // generation settings
    const [numberOfQuestions, setNumberOfQuestions] = useState(10);
    const [difficulty, setDifficulty] = useState("Mixed");
    const [bankName, setBankName] = useState("");
    const [banks, setBanks] = useState<Bank[]>([]);

    const [generating, setGenerating] = useState(false);
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [accepted, setAccepted] = useState<boolean[]>([]);
    // index of the question card being edited (null = none)
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [saving, setSaving] = useState(false);

    // drag-and-drop area
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // existing bank names, as suggestions for the "Bank" box
    useEffect(() => {
        fetch("/api/questions/banks", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : { banks: [] }))
            .then((data) => setBanks(data.banks))
            .catch((error) => console.error("Error loading banks:", error));
    }, []);

    // Which step the indicator highlights.
    let currentStep = 1;
    if (text.trim() !== "") currentStep = 2;
    if (questions.length > 0) currentStep = 3;

    // Called when a file is dropped on the area or picked with the file dialog.
    const handlePickedFile = (pickedFile: File | undefined) => {
        if (!pickedFile) return;

        const isPdf = pickedFile.type === "application/pdf" || pickedFile.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            toast.error("Please choose a PDF file");
            return;
        }

        setFile(pickedFile);
        handleExtract(pickedFile); // extract right away, no extra button press
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handlePickedFile(e.dataTransfer.files?.[0]);
    };

    const handleExtract = async (pdfFile: File) => {
        setExtracting(true);

        try {
            const formData = new FormData();
            formData.append("pdf", pdfFile);

            const response = await fetch("/api/ai/extract-pdf", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not extract text from that PDF");
                return;
            }

            setText(data.text);
            toast.success("Text extracted. Check it below, then generate questions.");
        } catch (error) {
            console.error("Error extracting PDF:", error);
            toast.error("Something went wrong while extracting the PDF. Please try again.");
        } finally {
            setExtracting(false);
        }
    };

    const handleGenerate = async () => {
        // explain what's missing instead of greying the button out
        if (text.trim().length < 50) {
            toast.error("Add at least 50 characters of text first (upload a PDF or paste your notes).");
            return;
        }
        if (numberOfQuestions < 1 || numberOfQuestions > 100) {
            toast.error("Number of questions must be between 1 and 100.");
            return;
        }

        setGenerating(true);

        try {
            const response = await fetch("/api/ai/qenerate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, numberOfQuestions, difficulty }),
            });
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not generate questions");
                return;
            }

            setQuestions(data.questions);
            setAccepted(data.questions.map(() => true)); // all accepted to start with
            setEditingIndex(null);
            toast.success(`Generated ${data.questions.length} questions. Review them below.`);
        } catch (error) {
            console.error("Error generating questions:", error);
            toast.error("Something went wrong while generating the questions. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const toggleAccepted = (index: number) => {
        setAccepted((prev) => prev.map((value, i) => (i === index ? !value : value)));
    };

    // ---- editing one generated question in place ----
    const updateQuestionText = (index: number, value: string) => {
        setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, questionText: value } : q)));
    };

    const updateOptionText = (questionIndex: number, optionIndex: number, value: string) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== questionIndex) return q;
                const options = q.options.map((o, j) => (j === optionIndex ? { ...o, optionText: value } : o));
                return { ...q, options };
            })
        );
    };

    // MCQ: exactly one correct option, so picking one un-picks the others.
    const setCorrectOption = (questionIndex: number, optionIndex: number) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== questionIndex) return q;
                const options = q.options.map((o, j) => ({ ...o, isCorrect: j === optionIndex }));
                return { ...q, options };
            })
        );
    };

    const handleBulkSave = async () => {
        if (accepted.filter(Boolean).length === 0) {
            toast.error("Accept at least one question to save.");
            return;
        }
        if (bankName.trim() === "") {
            toast.error("Choose or type a bank name first (in the settings row above).");
            return;
        }

        setSaving(true);

        const approvedQuestions = questions
            .filter((_, index) => accepted[index])
            .map((question) => ({ ...question, bankName: bankName.trim() }));

        try {
            const response = await fetch("/api/questions/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(approvedQuestions),
            });
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not save questions");
                return;
            }

            toast.success(`Saved ${data.totalQuestions} question(s) to “${bankName.trim()}”`);
            setQuestions([]);
            setAccepted([]);
            setEditingIndex(null);
        } catch (error) {
            console.error("Error saving questions:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const acceptedCount = accepted.filter(Boolean).length;

    return (
        <div>
            <PageHeader
                title="AI Question Generator"
                description="Turn study material into draft questions, review them, and save the good ones to a bank."
            >
                <StepIndicator currentStep={currentStep} />
            </PageHeader>

            <Card>
                <CardContent className="flex flex-col gap-6">
                    {/* Step 1: big drag-and-drop area. Clicking it (or Enter/Space) opens the file picker. */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                fileInputRef.current?.click();
                            }
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                            isDragging
                                ? "border-primary bg-accent"
                                : "border-border bg-muted/40 hover:border-primary/60 hover:bg-muted"
                        }`}
                    >
                        {extracting ? (
                            <>
                                <Loader2 className="size-9 animate-spin text-primary" />
                                <p className="text-sm font-medium">Extracting text from {file?.name}...</p>
                            </>
                        ) : file ? (
                            <>
                                <FileText className="size-9 text-primary" />
                                <p className="text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">Drop another PDF or click to replace it</p>
                            </>
                        ) : (
                            <>
                                <Upload className="size-9 text-primary" />
                                <p className="text-sm font-medium">Drag &amp; drop a PDF here, or <span className="text-primary underline">browse</span></p>
                                <p className="text-xs text-muted-foreground">You can also paste text straight into the box below</p>
                            </>
                        )}
                    </div>

                    {/* the real file input, hidden -- the area above opens it */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                            handlePickedFile(e.target.files?.[0]);
                            e.target.value = ""; // lets the same file be picked again
                        }}
                    />

                    {/* Step 2: the extracted text (taller box) */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="studyText">Extracted text</Label>
                        <Textarea
                            id="studyText"
                            rows={14}
                            placeholder="Extracted PDF text will appear here (or paste your own study material)."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="min-h-72"
                        />
                        <p className="text-xs text-muted-foreground">
                            {text.trim().length} characters
                            {text.trim().length > 0 && text.trim().length < 50 && " · add at least 50 to generate"}
                        </p>
                    </div>

                    {/* Step 3: settings + main button in one row, right-aligned */}
                    <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-end md:justify-end">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="numberOfQuestions">Questions</Label>
                            <Input
                                id="numberOfQuestions"
                                type="number"
                                min={1}
                                max={100}
                                value={numberOfQuestions}
                                onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                                className="md:w-24"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Difficulty</Label>
                            <Select value={difficulty} onValueChange={(value) => setDifficulty(value ?? "Mixed")}>
                                <SelectTrigger className="w-full md:w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Mixed">Mixed</SelectItem>
                                    <SelectItem value="Easy">Easy</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Type a new bank name, or pick an existing one from the suggestions */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="bankName">Bank</Label>
                            <Input
                                id="bankName"
                                placeholder="e.g. Core CS - Set 1"
                                list="ai-bank-options"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="md:w-56"
                            />
                            <datalist id="ai-bank-options">
                                {banks.map((bank) =>
                                    bank.bankName ? <option key={bank.bankName} value={bank.bankName} /> : null
                                )}
                            </datalist>
                        </div>

                        <Button onClick={handleGenerate} disabled={generating} className="md:self-end">
                            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                            {generating ? "Generating..." : "Generate questions"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Generated questions as cards, each with Accept and Edit */}
            {questions.length > 0 && (
                <div className="mt-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">
                            Generated questions{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                                ({acceptedCount} of {questions.length} accepted)
                            </span>
                        </h2>
                        <Button onClick={handleBulkSave} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin" /> : <Check />}
                            {saving ? "Saving..." : `Save ${acceptedCount} to bank`}
                        </Button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {questions.map((question, index) => {
                            const isAccepted = accepted[index];
                            const isEditing = editingIndex === index;

                            return (
                                <Card
                                    key={index}
                                    className={isAccepted ? "ring-primary/50" : "opacity-60"}
                                >
                                    <CardHeader>
                                        <CardTitle className="flex items-start justify-between gap-2 text-sm">
                                            <span className="text-muted-foreground">Question {index + 1}</span>
                                            <span className="flex gap-1.5">
                                                {question.difficulty && <Badge variant="secondary">{question.difficulty}</Badge>}
                                                <Badge variant="outline">{question.marks} mark{question.marks === 1 ? "" : "s"}</Badge>
                                            </span>
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="flex flex-col gap-3">
                                        {isEditing ? (
                                            <>
                                                <Textarea
                                                    value={question.questionText}
                                                    onChange={(e) => updateQuestionText(index, e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">Click the circle to mark the correct answer.</p>
                                                {question.options.map((option, optionIndex) => (
                                                    <div key={optionIndex} className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${index}`}
                                                            checked={option.isCorrect}
                                                            onChange={() => setCorrectOption(index, optionIndex)}
                                                            aria-label={`Mark option ${optionIndex + 1} as correct`}
                                                        />
                                                        <Input
                                                            value={option.optionText}
                                                            onChange={(e) => updateOptionText(index, optionIndex, e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium">{question.questionText}</p>
                                                <ul className="flex flex-col gap-1.5">
                                                    {question.options.map((option, optionIndex) => (
                                                        <li
                                                            key={optionIndex}
                                                            className={`rounded-md border px-3 py-1.5 text-sm ${
                                                                option.isCorrect ? "border-primary bg-accent font-medium" : ""
                                                            }`}
                                                        >
                                                            {option.optionText}
                                                            {option.isCorrect && <span className="ml-2 text-xs text-primary">✓</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}

                                        <div className="mt-1 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={isAccepted ? "default" : "outline"}
                                                onClick={() => toggleAccepted(index)}
                                            >
                                                {isAccepted ? <Check /> : <X />}
                                                {isAccepted ? "Accepted" : "Rejected"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingIndex(isEditing ? null : index)}
                                            >
                                                <Pencil /> {isEditing ? "Done" : "Edit"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
