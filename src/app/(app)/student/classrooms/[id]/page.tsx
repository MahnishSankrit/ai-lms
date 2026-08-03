// Shows one classroom's details, its exams, and a way to leave it.

"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type ClassroomDetails = {
    id: string;
    name: string;
    subject: string;
    description: string | null;
    memberCount: number;
    teacher: { id: string; email: string };
};

type Exam = {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    classroom: { id: string; name: string };
};

export default function ClassroomDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const classroomId = params.id as string;

    const [classroom, setClassroom] = useState<ClassroomDetails | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [leaving, setLeaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const classroomResponse = await fetch(`/api/classrooms/details/${classroomId}`);
            const classroomData = await classroomResponse.json();

            if (!classroomResponse.ok) {
                setError(classroomData.error || "Failed to load classroom");
                return;
            }

            setClassroom(classroomData.classroom);

            // The exams API just returns every exam this student can see,
            // so we keep only the ones that belong to this classroom.
            const examsResponse = await fetch("/api/exams/get-exams");
            const examsData = await examsResponse.json();

            if (examsResponse.ok) {
                const classroomExams = examsData.exams.filter(
                    (exam: Exam) => exam.classroom.id === classroomId
                );
                setExams(classroomExams);
            }
        } catch (err) {
            console.error("Error loading classroom:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classroomId]);

    const handleLeave = async () => {
        setLeaving(true);

        try {
            const response = await fetch("/api/classrooms/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ classroomId }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not leave classroom");
                return;
            }

            toast.success("You left the classroom");
            router.push("/student/classrooms");
        } catch (err) {
            console.error("Error leaving classroom:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLeaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        );
    }

    if (error) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    if (!classroom) {
        return null;
    }

    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{classroom.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{classroom.subject}</p>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                        <LogOut /> Leave classroom
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Leave {classroom.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You&apos;ll lose access to its exams and materials. You can rejoin later with the
                                classroom&apos;s join code.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLeave} disabled={leaving}>
                                {leaving ? "Leaving..." : "Leave classroom"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {classroom.description && (
                <p className="mt-3 text-sm text-muted-foreground">{classroom.description}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
                Teacher: {classroom.teacher.email} · {classroom.memberCount} student(s)
            </p>

            <h2 className="mt-8 text-lg font-semibold">Exams</h2>

            {exams.length === 0 && (
                <EmptyState
                    icon={FileText}
                    title="No exams yet"
                    description="Your teacher hasn't published any exams in this classroom."
                />
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {exams.map((exam) => (
                    <Link key={exam.id} href={`/student/exams/${exam.id}`}>
                        <Card className="transition hover:border-primary/40 hover:shadow-md">
                            <CardContent>
                                <p className="font-semibold">{exam.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {exam.durationMinutes} min · {exam.totalMarks} marks
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
