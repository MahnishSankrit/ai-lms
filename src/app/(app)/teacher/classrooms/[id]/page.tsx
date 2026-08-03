// Shows one classroom's details: join code, member list, its exams,
// and a small form to post an announcement to all members.

"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ClassroomDetails = {
    id: string;
    name: string;
    subject: string;
    description: string | null;
    joinCode: string;
    memberCount: number;
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
    const [members, setMembers] = useState<Member[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [posting, setPosting] = useState(false);
    const [announceMessage, setAnnounceMessage] = useState("");

    useEffect(() => {
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
            } catch (err) {
                console.error("Error loading classroom:", err);
                setError("Something went wrong. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [classroomId]);

    const handleAnnounce = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAnnounceMessage("");
        setPosting(true);

        try {
            const response = await fetch(`/api/classrooms/${classroomId}/announcement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content }),
            });

            const data = await response.json();

            if (!response.ok) {
                setAnnounceMessage(data.error || "Could not post announcement");
                return;
            }

            setAnnounceMessage("Announcement posted!");
            setTitle("");
            setContent("");
        } catch (err) {
            console.error("Error posting announcement:", err);
            setAnnounceMessage("Something went wrong. Please try again.");
        } finally {
            setPosting(false);
        }
    };

    if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!classroom) return null;

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{classroom.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{classroom.subject}</p>
            {classroom.description && <p className="mt-2 text-sm text-slate-600">{classroom.description}</p>}
            <p className="mt-2 text-xs text-slate-400">
                Join code: {classroom.joinCode} · {classroom.memberCount} student(s)
            </p>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Students</h2>
                    {members.length === 0 && <p className="mt-2 text-sm text-slate-500">No students yet.</p>}
                    <ul className="mt-3 flex flex-col gap-2">
                        {members.map((member) => (
                            <li key={member.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                {member.user.email}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Exams</h2>
                    {exams.length === 0 && <p className="mt-2 text-sm text-slate-500">No exams yet.</p>}
                    <ul className="mt-3 flex flex-col gap-2">
                        {exams.map((exam) => (
                            <li key={exam.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                                <Link href={`/teacher/exams/${exam.id}/edit`} className="font-medium text-slate-900 hover:underline">
                                    {exam.title}
                                </Link>
                                <span className="ml-2 text-xs capitalize text-slate-500">{exam.status}</span>
                            </li>
                        ))}
                    </ul>
                    <Link href="/teacher/exams/new" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
                        + Create exam
                    </Link>
                </div>
            </div>

            <form onSubmit={handleAnnounce} className="mt-8 flex max-w-md flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Post an announcement</p>
                <input
                    type="text"
                    placeholder="Title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
                <textarea
                    placeholder="Message"
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
                <button
                    type="submit"
                    disabled={posting}
                    className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                    {posting ? "Posting..." : "Post announcement"}
                </button>
                {announceMessage && <p className="text-sm text-slate-600">{announceMessage}</p>}
            </form>
        </div>
    );
}
