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
import ScoreTrendChart from "@/components/score-trend-chart";
import StatCard from "@/components/stat-card";

type Exam = {
    id: string;
    title: string;
    status: string;
    startsAt: string | null;
    createdAt: string;
    totalMarks: number;
    classroom: { id: string; name: string };
};

type Classroom = { id: string };
type Member = { userId: string };
type TrendPoint = { label: string; value: number; name: string; date: string };

export default function TeacherDashboardPage() {
    const [classroomCount, setClassroomCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [exams, setExams] = useState<Exam[]>([]);
    const [questionCount, setQuestionCount] = useState(0);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [examScorePoints, setExamScorePoints] = useState<TrendPoint[]>([]);
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
                const recentExams = examList.slice(0, 5);
                const resultsSamples = await Promise.all(
                    recentExams.map((exam) =>
                        fetch(`/api/exams/${exam.id}/results`).then((r) => (r.ok ? r.json() : null))
                    )
                );
                const scored = resultsSamples.filter((r) => r && r.statistic.totalAttempts > 0);
                if (scored.length > 0) {
                    const total = scored.reduce((sum, r) => sum + r.statistic.averageScore, 0);
                    setAverageScore(total / scored.length);
                }

                // Same data, reshaped into percentage-per-exam points for the chart.
                const points = recentExams
                    .map((exam, index) => {
                        const result = resultsSamples[index];
                        if (!result || result.statistic.totalAttempts === 0 || exam.totalMarks === 0) return null;
                        return {
                            label: exam.title.length > 12 ? `${exam.title.slice(0, 12)}...` : exam.title,
                            value: (result.statistic.averageScore / exam.totalMarks) * 100,
                            name: exam.title,
                            date: new Date(exam.startsAt ?? exam.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                            }),
                        };
                    })
                    .reverse() // recentExams is newest-first; charts read left-to-right chronologically
                    .filter((point): point is TrendPoint => point !== null);
                setExamScorePoints(points);
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
                    <StatCard href="/teacher/classrooms" label="Students" value={studentCount} icon={Users} />
                    <StatCard href="/teacher/classrooms" label="Classrooms" value={classroomCount} icon={Building2} />
                    <StatCard href="/teacher/exams" label="Exams" value={exams.length} icon={FileText} />
                    <StatCard href="/teacher/questions" label="Questions" value={questionCount} icon={BookOpen} />
                    <StatCard
                        href="/teacher/results"
                        label="Avg. score"
                        value={averageScore === null ? "—" : averageScore.toFixed(1)}
                        icon={BarChart3}
                    />
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
                                        <Link
                                            href={`/teacher/exams/${exam.id}/edit`}
                                            className="block rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
                                        >
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
                                    <li key={exam.id}>
                                        <Link
                                            href={`/teacher/exams/${exam.id}/edit`}
                                            className="block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
                                        >
                                            Created <span className="font-medium text-foreground">{exam.title}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Average score by exam</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScoreTrendChart points={examScorePoints} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
