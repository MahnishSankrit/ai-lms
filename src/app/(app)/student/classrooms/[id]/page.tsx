// One classroom, from the student's point of view:
// teacher + classmates count, announcements, upcoming exams, past exams,
// and a button to leave the classroom.
// Everything comes from one API call: /api/classrooms/details/[id]

"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, History, LogOut, Megaphone, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import RelativeDate from "@/components/relative-date";

type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: string;
};

type Exam = {
    id: string;
    title: string;
    status: string;
    durationMinutes: number;
    totalMarks: number;
    startsAt: string | null;
    endsAt: string | null;
};

type MyAttempt = {
    id: string;
    examId: string;
    status: string;
    score: number | null;
};

type ClassroomDetails = {
    id: string;
    name: string;
    subject: string | null;
    description: string | null;
    memberCount: number;
    teacherName: string;
    announcements: Announcement[];
    exams: Exam[];
    myAttempts: MyAttempt[];
};

// An exam is "past" if the teacher completed it or its end time has passed.
function isPastExam(exam: Exam) {
    if (exam.status === "completed") {
        return true;
    }
    if (exam.endsAt && new Date(exam.endsAt) < new Date()) {
        return true;
    }
    return false;
}

export default function ClassroomDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const classroomId = params.id as string;

    const [classroom, setClassroom] = useState<ClassroomDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [leaving, setLeaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`/api/classrooms/details/${classroomId}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load classroom");
                return;
            }

            setClassroom(data.classroom);
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
                <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                </div>
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>
        );
    }

    if (error) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    if (!classroom) {
        return null;
    }

    // Split the exams into upcoming and past.
    const upcomingExams: Exam[] = [];
    const pastExams: Exam[] = [];
    for (const exam of classroom.exams) {
        if (isPastExam(exam)) {
            pastExams.push(exam);
        } else {
            upcomingExams.push(exam);
        }
    }

    // Finds this student's attempt for an exam (or undefined if they never started it).
    const findMyAttempt = (examId: string) => {
        return classroom.myAttempts.find((attempt) => attempt.examId === examId);
    };

    // Everyone in the class except me.
    const classmates = Math.max(classroom.memberCount - 1, 0);

    return (
        <div>
            {/* Header + leave button */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{classroom.name}</h1>
                    {classroom.subject && <p className="mt-1 text-sm text-muted-foreground">{classroom.subject}</p>}
                    {classroom.description && (
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{classroom.description}</p>
                    )}
                </div>

                <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                        <LogOut /> Leave classroom
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Leave {classroom.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You&apos;ll lose access to its exams. You can rejoin later with the
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

            {/* Teacher + classmates */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center gap-3">
                        <UserRound className="size-8 text-primary/60" />
                        <div>
                            <p className="text-sm text-muted-foreground">Teacher</p>
                            <p className="font-semibold">{classroom.teacherName}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3">
                        <Users className="size-8 text-primary/60" />
                        <div>
                            <p className="text-sm text-muted-foreground">Classmates</p>
                            <p className="font-semibold">{classmates}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Announcements */}
                <Card className="lg:row-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">Announcements</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {classroom.announcements.length === 0 ? (
                            <EmptyState icon={Megaphone} title="No announcements" description="Your teacher hasn't posted anything yet." />
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {classroom.announcements.map((announcement) => (
                                    <li key={announcement.id} className="rounded-lg border p-3">
                                        <p className="font-medium">{announcement.title}</p>
                                        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                                            {announcement.content}
                                        </p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            <RelativeDate date={announcement.createdAt} />
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming exams */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Upcoming exams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingExams.length === 0 ? (
                            <EmptyState icon={CalendarClock} title="No upcoming exams" description="New exams will show up here." />
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {upcomingExams.map((exam) => {
                                    const myAttempt = findMyAttempt(exam.id);
                                    return (
                                        <li key={exam.id}>
                                            <Link
                                                href={`/student/exams/${exam.id}`}
                                                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
                                            >
                                                <div>
                                                    <p className="font-medium">{exam.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {exam.durationMinutes} min · {exam.totalMarks} marks
                                                        {exam.startsAt && (
                                                            <>
                                                                {" · starts "}
                                                                <RelativeDate date={exam.startsAt} />
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                                {myAttempt && myAttempt.status === "in_progress" && (
                                                    <Badge variant="secondary">In progress</Badge>
                                                )}
                                                {myAttempt && myAttempt.status !== "in_progress" && <Badge>Done</Badge>}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Past exams */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Past exams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pastExams.length === 0 ? (
                            <EmptyState icon={History} title="No past exams" description="Finished exams will show up here." />
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {pastExams.map((exam) => {
                                    const myAttempt = findMyAttempt(exam.id);
                                    return (
                                        <li key={exam.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                                            <div>
                                                <p className="font-medium">{exam.title}</p>
                                                {exam.endsAt && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Ended <RelativeDate date={exam.endsAt} />
                                                    </p>
                                                )}
                                            </div>
                                            {myAttempt && myAttempt.status !== "in_progress" ? (
                                                <Link
                                                    href={`/student/exams/${exam.id}/results?attemptId=${myAttempt.id}`}
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    View result
                                                </Link>
                                            ) : (
                                                <Badge variant="outline">Missed</Badge>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
