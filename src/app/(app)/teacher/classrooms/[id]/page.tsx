// Shows one classroom's details: join code, average score/pass rate,
// member list, its exams, and a small form to post an announcement.

"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/error-state";

type ClassroomDetails = {
    id: string;
    name: string;
    subject: string;
    description: string | null;
    joinCode: string;
    memberCount: number;
};

type ClassroomStats = {
    totalAttempts: number;
    averageScore: number;
    passRate: number;
};

type Member = {
    id: string;
    user: { id: string; email: string };
};

type Exam = {
    id: string;
    title: string;
    status: string;
    classroom: { id: string; name: string };
};

export default function TeacherClassroomDetailsPage() {
    const params = useParams();
    const classroomId = params.id as string;

    const [classroom, setClassroom] = useState<ClassroomDetails | null>(null);
    const [stats, setStats] = useState<ClassroomStats | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [posting, setPosting] = useState(false);

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

            const membersResponse = await fetch(`/api/classrooms/${classroomId}/members`);
            const membersData = await membersResponse.json();
            if (membersResponse.ok) {
                setMembers(membersData.members);
            }

            // The exams API returns every exam this teacher owns,
            // so we keep only the ones that belong to this classroom.
            const examsResponse = await fetch("/api/exams/get-exams");
            const examsData = await examsResponse.json();
            if (examsResponse.ok) {
                const classroomExams = examsData.exams.filter(
                    (exam: Exam) => exam.classroom.id === classroomId
                );
                setExams(classroomExams);
            }

            // Same idea: this endpoint covers every classroom the teacher
            // owns, so we just pick out this one's stats.
            const statsResponse = await fetch("/api/results/classroom");
            const statsData = await statsResponse.json();
            if (statsResponse.ok) {
                const thisClassroom = statsData.results.classrooms.find(
                    (c: { classroomId: string }) => c.classroomId === classroomId
                );
                if (thisClassroom) setStats(thisClassroom);
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

    const handleRemoveMember = async (memberId: string, studentEmail: string) => {
        if (!confirm(`Remove ${studentEmail} from this classroom?`)) return;

        try {
            const response = await fetch(`/api/classrooms/${classroomId}/remove-member`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                // The API's "userId" field is actually the ClassroomMember id, not the User id.
                body: JSON.stringify({ userId: memberId }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not remove student");
                return;
            }

            toast.success("Student removed");
            loadData();
        } catch (err) {
            console.error("Error removing student:", err);
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleAnnounce = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPosting(true);

        try {
            const response = await fetch(`/api/classrooms/${classroomId}/announcement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not post announcement");
                return;
            }

            toast.success("Announcement posted");
            setTitle("");
            setContent("");
        } catch (err) {
            console.error("Error posting announcement:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setPosting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        );
    }

    if (error) return <ErrorState message={error} onRetry={loadData} />;
    if (!classroom) return null;

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{classroom.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{classroom.subject}</p>
            {classroom.description && <p className="mt-2 text-sm text-muted-foreground">{classroom.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
                Join code: {classroom.joinCode} · {classroom.memberCount} student(s)
            </p>

            <div className="mt-4 flex flex-wrap gap-4">
                <Card>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Average score</p>
                        <p className="text-lg font-semibold">
                            {stats && stats.totalAttempts > 0 ? stats.averageScore : "—"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Pass rate</p>
                        <p className="text-lg font-semibold">
                            {stats && stats.totalAttempts > 0 ? `${stats.passRate}%` : "—"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Attempts</p>
                        <p className="text-lg font-semibold">{stats?.totalAttempts ?? 0}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                    <h2 className="text-lg font-semibold">Students</h2>
                    {members.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No students yet.</p>}
                    <ul className="mt-3 flex flex-col gap-2">
                        {members.map((member) => (
                            <li key={member.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                {member.user.email}
                                <button
                                    onClick={() => handleRemoveMember(member.id, member.user.email)}
                                    className="text-xs font-medium text-destructive hover:underline"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-lg font-semibold">Exams</h2>
                    {exams.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No exams yet.</p>}
                    <ul className="mt-3 flex flex-col gap-2">
                        {exams.map((exam) => (
                            <li key={exam.id} className="rounded-md border px-3 py-2 text-sm">
                                <Link href={`/teacher/exams/${exam.id}/edit`} className="font-medium hover:underline">
                                    {exam.title}
                                </Link>
                                <span className="ml-2 text-xs capitalize text-muted-foreground">{exam.status}</span>
                            </li>
                        ))}
                    </ul>
                    <Link href="/teacher/exams/new" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                        + Create exam
                    </Link>
                </div>
            </div>

            <form onSubmit={handleAnnounce} className="mt-8 flex max-w-md flex-col gap-3 rounded-md border p-4">
                <p className="text-sm font-semibold">Post an announcement</p>
                <Input
                    placeholder="Title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                    placeholder="Message"
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <Button type="submit" disabled={posting} className="self-start">
                    {posting ? "Posting..." : "Post announcement"}
                </Button>
            </form>
        </div>
    );
}
