// Student dashboard overview: a few stat cards, upcoming exams, and
// recent results, all pulled from APIs the other student pages already use.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Building2, CalendarClock, ClipboardList } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ScoreTrendChart from "@/components/score-trend-chart";

type Exam = {
    id: string;
    title: string;
    startsAt: string | null;
    endsAt: string | null;
    classroom: { id: string; name: string };
};

type ResultSummary = {
    id: string;
    examId: string;
    examTitle: string;
    score: number | null;
    totalMarks: number;
    percentage: number;
    pass: boolean;
};

type AttemptHistoryEntry = {
    status: string;
    score: number | null;
    startedAt: string;
    exam: { totalMarks: number };
};

export default function StudentDashboardPage() {
    const [classroomCount, setClassroomCount] = useState(0);
    const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
    const [recentResults, setRecentResults] = useState<ResultSummary[]>([]);
    const [trendPoints, setTrendPoints] = useState<{ label: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const classroomsResponse = await fetch("/api/classrooms/get-classrooms");
                const classroomsData = await classroomsResponse.json();
                if (classroomsResponse.ok) {
                    setClassroomCount(classroomsData.classrooms.length);
                }

                const examsResponse = await fetch("/api/exams/get-exams");
                const examsData = await examsResponse.json();
                if (examsResponse.ok) {
                    // "Upcoming" here means "still available to take" --
                    // exams that haven't ended yet, whether they're
                    // scheduled for later or already ongoing right now.
                    // (get-exams itself already excludes draft/completed ones.)
                    const upcoming = (examsData.exams as Exam[])
                        .filter((exam) => !exam.endsAt || new Date(exam.endsAt) >= new Date())
                        .slice(0, 5);
                    setUpcomingExams(upcoming);
                }

                const resultsResponse = await fetch("/api/results/students?limit=5");
                const resultsData = await resultsResponse.json();
                if (resultsResponse.ok) {
                    setRecentResults(resultsData.results.attempts);
                }

                // Score trend chart: attempt history has timestamps, unlike
                // /api/results/students, so we use it here and compute the
                // percentage ourselves.
                const historyResponse = await fetch("/api/attempts/history?limit=8");
                const historyData = await historyResponse.json();
                if (historyResponse.ok) {
                    const graded = (historyData.attempts as AttemptHistoryEntry[])
                        .filter((attempt) => attempt.score !== null && attempt.exam.totalMarks > 0)
                        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

                    setTrendPoints(
                        graded.map((attempt) => ({
                            label: new Date(attempt.startedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                            }),
                            value: (attempt.score! / attempt.exam.totalMarks) * 100,
                        }))
                    );
                }
            } catch (error) {
                console.error("Error loading student dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const averagePercentage =
        recentResults.length > 0
            ? recentResults.reduce((sum, result) => sum + result.percentage, 0) / recentResults.length
            : null;

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

            {loading ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Classrooms</p>
                                <p className="mt-1 text-3xl font-bold">{classroomCount}</p>
                            </div>
                            <Building2 className="size-8 text-primary/60" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Upcoming exams</p>
                                <p className="mt-1 text-3xl font-bold">{upcomingExams.length}</p>
                            </div>
                            <CalendarClock className="size-8 text-primary/60" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Recent average</p>
                                <p className="mt-1 text-3xl font-bold">
                                    {averagePercentage === null ? "—" : `${averagePercentage.toFixed(0)}%`}
                                </p>
                            </div>
                            <BarChart3 className="size-8 text-primary/60" />
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Upcoming exams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-20 w-full" />
                        ) : upcomingExams.length === 0 ? (
                            <EmptyState
                                icon={CalendarClock}
                                title="No upcoming exams"
                                description="Check back once your teacher publishes one."
                            />
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {upcomingExams.map((exam) => (
                                    <li key={exam.id}>
                                        <Link
                                            href={`/student/exams/${exam.id}`}
                                            className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary/40"
                                        >
                                            <div>
                                                <p className="font-medium">{exam.title}</p>
                                                <p className="text-xs text-muted-foreground">{exam.classroom.name}</p>
                                            </div>
                                            {exam.startsAt && (
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(exam.startsAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-20 w-full" />
                        ) : recentResults.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="No results yet"
                                description="Results show up here after you submit an exam."
                            />
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {recentResults.map((result) => (
                                    <li key={result.id}>
                                        <Link
                                            href={`/student/exams/${result.examId}/results?attemptId=${result.id}`}
                                            className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary/40"
                                        >
                                            <span className="font-medium">{result.examTitle}</span>
                                            <Badge variant={result.pass ? "default" : "destructive"}>
                                                {result.percentage.toFixed(0)}%
                                            </Badge>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-base">Score trend</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-32 w-full" /> : <ScoreTrendChart points={trendPoints} />}
                </CardContent>
            </Card>
        </div>
    );
}
