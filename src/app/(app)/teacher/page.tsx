// Teacher dashboard overview.
// Combines a few existing endpoints (classrooms, exams, questions,
// per-exam results) into stat cards -- there's no single "teacher stats"
// API, so this just calls what already exists and adds the numbers up.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    BarChart3,
    BookOpen,
    Building2,
    FileText,
    Plus,
    Sparkles,
    Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";

type Exam = {
    id: string;
    title: string;
    status: string;
    startsAt: string | null;
    createdAt: string;
    classroom: { id: string; name: string };
};

type Classroom = { id: string };
type Member = { userId: string };

export default function TeacherDashboardPage() {
    const [classroomCount, setClassroomCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [exams, setExams] = useState<Exam[]>([]);
    const [questionCount, setQuestionCount] = useState(0);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const classroomsResponse = await fetch("/api/classrooms/get-classrooms");
                const classroomsData = await classroomsResponse.json();
                const classrooms: Classroom[] = classroomsResponse.ok ? classroomsData.classrooms : [];
                setClassroomCount(classrooms.length);

                // Unique students across all classrooms. Fine for a handful of
                // classrooms; a real aggregate API would be better at scale.
                const memberLists = await Promise.all(
                    classrooms.map((classroom) =>
                        fetch(`/api/classrooms/${classroom.id}/members`).then((r) => (r.ok ? r.json() : { members: [] }))
                    )
                );
                const uniqueStudentIds = new Set<string>();
                memberLists.forEach((data) => {
                    (data.members as Member[]).forEach((member) => uniqueStudentIds.add(member.userId));
                });
                setStudentCount(uniqueStudentIds.size);

                const examsResponse = await fetch("/api/exams/get-exams");
                const examsData = await examsResponse.json();
                const examList: Exam[] = examsResponse.ok ? examsData.exams : [];
                setExams(examList);

                const questionsResponse = await fetch("/api/questions/get-questions?limit=1");
                const questionsData = await questionsResponse.json();
                if (questionsResponse.ok) {
                    setQuestionCount(questionsData.totalCount);
                }

                // Average score across recent exams that already have attempts.
                const resultsSamples = await Promise.all(
                    examList.slice(0, 5).map((exam) =>
                        fetch(`/api/exams/${exam.id}/results`).then((r) => (r.ok ? r.json() : null))
                    )
                );
                const scored = resultsSamples.filter((r) => r && r.statistic.totalAttempts > 0);
                if (scored.length > 0) {
                    const total = scored.reduce((sum, r) => sum + r.statistic.averageScore, 0);
                    setAverageScore(total / scored.length);
                }
            } catch (error) {
                console.error("Error loading teacher dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const upcomingExams = exams
        .filter((exam) => exam.status === "published" && (!exam.startsAt || new Date(exam.startsAt) >= new Date()))
        .slice(0, 5);

    const recentActivity = [...exams]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" render={<Link href="/teacher/classrooms" />}>
                        <Plus /> New classroom
                    </Button>
                    <Button size="sm" variant="outline" render={<Link href="/teacher/exams/new" />}>
                        <Plus /> New exam
                    </Button>
                    <Button size="sm" variant="outline" render={<Link href="/teacher/ai" />}>
                        <Sparkles /> AI Generate
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardContent>
                            <Users className="size-5 text-primary/60" />
                            <p className="mt-2 text-2xl font-bold">{studentCount}</p>
                            <p className="text-xs text-muted-foreground">Students</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Building2 className="size-5 text-primary/60" />
                            <p className="mt-2 text-2xl font-bold">{classroomCount}</p>
                            <p className="text-xs text-muted-foreground">Classrooms</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <FileText className="size-5 text-primary/60" />
                            <p className="mt-2 text-2xl font-bold">{exams.length}</p>
                            <p className="text-xs text-muted-foreground">Exams</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <BookOpen className="size-5 text-primary/60" />
                            <p className="mt-2 text-2xl font-bold">{questionCount}</p>
                            <p className="text-xs text-muted-foreground">Questions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <BarChart3 className="size-5 text-primary/60" />
                            <p className="mt-2 text-2xl font-bold">
                                {averageScore === null ? "—" : averageScore.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">Avg. score</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Upcoming exams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingExams.length === 0 ? (
                            <EmptyState icon={FileText} title="Nothing scheduled" description="Publish an exam to see it here." />
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {upcomingExams.map((exam) => (
                                    <li key={exam.id}>
                                        <Link href={`/teacher/exams/${exam.id}/edit`} className="text-sm hover:underline">
                                            {exam.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Recent activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentActivity.length === 0 ? (
                            <EmptyState icon={FileText} title="No activity yet" description="Created exams show up here." />
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {recentActivity.map((exam) => (
                                    <li key={exam.id} className="text-sm text-muted-foreground">
                                        Created <span className="font-medium text-foreground">{exam.title}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Score distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                            Chart coming soon
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
