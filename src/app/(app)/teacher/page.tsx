// Teacher dashboard overview.
// Combines a few existing endpoints (classrooms, exams, questions,
// per-exam results) -- there's no single "teacher stats" API, so this just
// calls what already exists and adds the numbers up.
//
// Layout (most important first):
//   [Avg score + trend] [Active exams] [Students] [Questions]
//   [Average score by exam chart  (2/3)] [Upcoming exams (1/3)]
//   [Recent activity, full width, with timestamps]
// The classroom count is a small line under the title, and the main
// buttons (New exam, AI Generate) live only in the header.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, CalendarClock, FileText, Plus, Sparkles, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import ScoreTrendChart from "@/components/score-trend-chart";
import StatCard from "@/components/stat-card";
import RelativeDate from "@/components/relative-date";
import { formatIndianDateTime } from "@/lib/format-date";

type Exam = {
    id: string;
    title: string;
    status: string;
    startsAt: string | null;
    createdAt: string;
    totalMarks: number;
    classroom: { id: string; name: string };
};

type Classroom = { id: string; createdAt: string };
type Member = { userId: string; createdAt: string };
type TrendPoint = { label: string; value: number; name: string; date: string };

// true if the date is within the last 7 days (for the "+N this week" trends)
function isThisWeek(date: string) {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(date).getTime() >= oneWeekAgo;
}

export default function TeacherDashboardPage() {
    const [classroomCount, setClassroomCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [exams, setExams] = useState<Exam[]>([]);
    const [questionCount, setQuestionCount] = useState(0);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [examScorePoints, setExamScorePoints] = useState<TrendPoint[]>([]);
    const [loading, setLoading] = useState(true);
    // how many were added in the last 7 days
    const [newStudents, setNewStudents] = useState(0);
    const [newQuestions, setNewQuestions] = useState(0);

    useEffect(() => {
        const load = async () => {
            try {
                // These three don't depend on each other, so fetch them at the same time.
                const [classroomsResponse, examsResponse, questionsResponse] = await Promise.all([
                    fetch("/api/classrooms/get-classrooms"),
                    fetch("/api/exams/get-exams"),
                    fetch("/api/questions/get-questions?limit=1"),
                ]);

                const classroomsData = await classroomsResponse.json();
                const classrooms: Classroom[] = classroomsResponse.ok ? classroomsData.classrooms : [];
                setClassroomCount(classrooms.length);

                const examsData = await examsResponse.json();
                const examList: Exam[] = examsResponse.ok ? examsData.exams : [];
                setExams(examList);

                const questionsData = await questionsResponse.json();
                if (questionsResponse.ok) {
                    setQuestionCount(questionsData.totalCount);
                    setNewQuestions(questionsData.addedThisWeek ?? 0);
                }

                // Unique students across all classrooms. Fine for a handful of
                // classrooms; a real aggregate API would be better at scale.
                const memberLists = await Promise.all(
                    classrooms.map((classroom) =>
                        fetch(`/api/classrooms/${classroom.id}/members`).then((r) => (r.ok ? r.json() : { members: [] }))
                    )
                );
                const uniqueStudentIds = new Set<string>();
                const studentsJoinedThisWeek = new Set<string>();
                memberLists.forEach((data) => {
                    (data.members as Member[]).forEach((member) => {
                        uniqueStudentIds.add(member.userId);
                        if (isThisWeek(member.createdAt)) {
                            studentsJoinedThisWeek.add(member.userId);
                        }
                    });
                });
                setStudentCount(uniqueStudentIds.size);
                setNewStudents(studentsJoinedThisWeek.size);

                // Average score across recent exams that already have attempts.
                const recentExams = examList.slice(0, 5);
                const resultsSamples = await Promise.all(
                    recentExams.map((exam) =>
                        fetch(`/api/exams/${exam.id}/results`).then((r) => (r.ok ? r.json() : null))
                    )
                );
                // Exams have different totals (one out of 462, another out of 6),
                // so average each exam's percentage, not its raw marks.
                const percentages: number[] = [];
                recentExams.forEach((exam, index) => {
                    const result = resultsSamples[index];
                    if (result && result.statistic.totalAttempts > 0 && exam.totalMarks > 0) {
                        percentages.push((result.statistic.averageScore / exam.totalMarks) * 100);
                    }
                });
                if (percentages.length > 0) {
                    const total = percentages.reduce((sum, value) => sum + value, 0);
                    setAverageScore(total / percentages.length);
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

    // Avg. score trend: the latest exam's average compared with the
    // average of the exams before it (needs at least 2 exams with results).
    let scoreTrend: number | undefined = undefined;
    if (examScorePoints.length >= 2) {
        const latest = examScorePoints[examScorePoints.length - 1].value;
        const earlier = examScorePoints.slice(0, -1);
        const earlierAverage = earlier.reduce((sum, point) => sum + point.value, 0) / earlier.length;
        scoreTrend = Math.round(latest - earlierAverage);
    }

    // "Active" = students can see it: published (not started yet) or ongoing.
    const activeExams = exams.filter((exam) => exam.status === "published" || exam.status === "ongoing");
    const ongoingCount = exams.filter((exam) => exam.status === "ongoing").length;

    const upcomingExams = exams
        .filter((exam) => exam.status === "published" && (!exam.startsAt || new Date(exam.startsAt) >= new Date()))
        .slice(0, 5);

    const recentActivity = [...exams]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

    return (
        <div>
            <PageHeader
                title="Dashboard"
                description={
                    loading
                        ? "Loading your overview..."
                        : `${classroomCount} classroom${classroomCount === 1 ? "" : "s"} · ${studentCount} student${studentCount === 1 ? "" : "s"}`
                }
                actions={
                    <>
                        <Button variant="outline" nativeButton={false} render={<Link href="/teacher/ai" />}>
                            <Sparkles /> AI Generate
                        </Button>
                        <Button nativeButton={false} render={<Link href="/teacher/exams/new" />}>
                            <Plus /> New exam
                        </Button>
                    </>
                }
            />

            {/* Row 1: the four stats, most important first */}
            {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        href="/teacher/results"
                        label="Avg. score"
                        value={averageScore === null ? "—" : `${averageScore.toFixed(1)}%`}
                        icon={BarChart3}
                        trend={scoreTrend}
                        trendLabel="pts vs earlier exams"
                    />
                    <StatCard
                        href="/teacher/exams"
                        label="Active exams"
                        value={activeExams.length}
                        icon={FileText}
                        trend={ongoingCount}
                        trendLabel="ongoing now"
                    />
                    <StatCard href="/teacher/classrooms" label="Students" value={studentCount} icon={Users} trend={newStudents} />
                    <StatCard href="/teacher/questions" label="Questions" value={questionCount} icon={BookOpen} trend={newQuestions} />
                </div>
            )}

            {/* Row 2: chart gets 2/3, upcoming exams 1/3 */}
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">Average score by exam</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-56 w-full" /> : <ScoreTrendChart points={examScorePoints} />}
                    </CardContent>
                </Card>

                {/* When nothing is scheduled this stays a small card with a button,
                    instead of a big empty box. */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Upcoming exams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-20 w-full" />
                        ) : upcomingExams.length === 0 ? (
                            <div className="flex flex-col items-start gap-3">
                                <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
                                <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/teacher/exams/new" />}>
                                    <CalendarClock /> Schedule exam
                                </Button>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {upcomingExams.map((exam) => (
                                    <li key={exam.id}>
                                        <Link
                                            href={`/teacher/exams/${exam.id}/edit`}
                                            className="flex flex-col rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
                                        >
                                            <span className="font-medium">{exam.title}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {exam.classroom.name}
                                                {exam.startsAt ? ` · ${formatIndianDateTime(exam.startsAt)}` : " · No start time"}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: recent activity, full width */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-base">Recent activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Skeleton className="h-24 w-full" />
                    ) : recentActivity.length === 0 ? (
                        <EmptyState icon={FileText} title="No activity yet" description="Created exams show up here." />
                    ) : (
                        <ul className="flex flex-col divide-y">
                            {recentActivity.map((exam) => (
                                <li key={exam.id}>
                                    <Link
                                        href={`/teacher/exams/${exam.id}/edit`}
                                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
                                    >
                                        <span>
                                            Created <span className="font-medium text-foreground">{exam.title}</span>
                                            {" "}in {exam.classroom.name}
                                        </span>
                                        {/* "2 days ago"; hover shows the full date and time */}
                                        <span className="shrink-0 text-xs">
                                            <RelativeDate date={exam.createdAt} />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
