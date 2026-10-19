// AI question generator workspace.
//
// Flow: upload a PDF -> extract its text -> generate questions from that
// text with Gemini -> review each generated question (uncheck the ones
// you don't want) -> bulk-save the approved ones to your question bank.

"use client"

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function AiGeneratorPage() {
    const [file, setFile] = useState<File | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [text, setText] = useState("");

    const [numberOfQuestions, setNumberOfQuestions] = useState(10);
    const [generating, setGenerating] = useState(false);
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [included, setIncluded] = useState<boolean[]>([]);

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const handleExtract = async () => {
        if (!file) return;
        setMessage("");
        setExtracting(true);

        try {
            const formData = new FormData();
            formData.append("pdf", file);

            const response = await fetch("/api/ai/extract-pdf", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not extract text from that PDF");
                toast.error(data.error || "Could not extract text from that PDF");
                return;
            }

            setText(data.text);
        } catch (error) {
            console.error("Error extracting PDF:", error);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        } finally {
            setExtracting(false);
        }
    };

    const handleGenerate = async () => {
        setMessage("");
        setGenerating(true);

        try {
            const response = await fetch("/api/ai/qenerate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, numberOfQuestions }),
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not generate questions");
                toast.error(data.error || "Could not generate questions");
                return;
            }

            setQuestions(data.questions);
            setIncluded(data.questions.map(() => true));
        } catch (error) {
            console.error("Error generating questions:", error);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const toggleIncluded = (index: number) => {
        setIncluded((prev) => prev.map((value, i) => (i === index ? !value : value)));
    };

    const handleBulkSave = async () => {
        setMessage("");
        setSaving(true);

        const approvedQuestions = questions.filter((_, index) => included[index]);

        try {
            const response = await fetch("/api/questions/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(approvedQuestions),
            });
            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not save questions");
                toast.error(data.error || "Could not save questions");
                return;
            }

            toast.success(`Saved ${data.totalQuestions} question(s) to your question bank`);

            setMessage(`Saved ${data.totalQuestions} question(s) to your question bank.`);
            setQuestions([]);
            setIncluded([]);
        } catch (error) {
            console.error("Error saving questions:", error);
            setMessage("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const approvedCount = included.filter(Boolean).length;

    return (
        <div className="flex max-w-3xl flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">AI Question Generator</h1>
                <p className="text-sm text-muted-foreground">
                    Upload study material, extract its text, and generate draft questions to review.
                </p>
            </div>

            {message && (
                <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Upload className="size-4" /> 1. Upload PDF
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="max-w-sm"
                    />
                    <Button onClick={handleExtract} disabled={!file || extracting}>
                        {extracting ? <Loader2 className="animate-spin" /> : null}
                        {extracting ? "Extracting..." : "Extract text"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">2. Extracted text</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <Textarea
                        rows={8}
                        placeholder="Extracted PDF text will appear here (or paste your own study material)."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />

                    <div className="flex flex-wrap items-center gap-3">
                        <Label htmlFor="numberOfQuestions" className="text-sm">
                            Number of questions
                        </Label>
                        <Input
                            id="numberOfQuestions"
                            type="number"
                            min={1}
                            max={100}
                            value={numberOfQuestions}
                            onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                            className="w-24"
                        />
                        <Button onClick={handleGenerate} disabled={text.trim().length < 50 || generating}>
                            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                            {generating ? "Generating..." : "Generate questions"}
                        </Button>
                    </div>
                    {text.trim().length > 0 && text.trim().length < 50 && (
                        <p className="text-xs text-muted-foreground">Add at least 50 characters of text to generate from.</p>
                    )}
                </CardContent>
            </Card>

            {questions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            3. Review generated questions ({approvedCount} of {questions.length} selected)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        {questions.map((question, index) => (
                            <div key={index} className="flex gap-3 rounded-lg border p-3">
                                <Checkbox
                                    checked={included[index]}
                                    onCheckedChange={() => toggleIncluded(index)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <p className="font-medium">{question.questionText}</p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {question.options.map((option, optionIndex) => (
                                            <Badge
                                                key={optionIndex}
                                                variant={option.isCorrect ? "default" : "outline"}
                                            >
                                                {option.optionText}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Button onClick={handleBulkSave} disabled={approvedCount === 0 || saving} className="self-start">
                            {saving ? "Saving..." : `Save ${approvedCount} question(s) to bank`}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
