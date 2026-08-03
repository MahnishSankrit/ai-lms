// Shows the classrooms the student has already joined,
// and a small form to join a new one using the join code
// their teacher shares with them.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type Classroom = {
    id: string;
    name: string;
    subject: string | null;
    owner: { id: string; email: string };
};

export default function StudentClassroomsPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [joinCode, setJoinCode] = useState("");
    const [joinMessage, setJoinMessage] = useState("");
    const [joining, setJoining] = useState(false);

    const loadClassrooms = async () => {
        setLoading(true);
        setLoadError("");

        try {
            const response = await fetch("/api/classrooms/get-classrooms");
            const data = await response.json();

            if (!response.ok) {
                setLoadError(data.error || "Failed to load classrooms");
                return;
            }

            setClassrooms(data.classrooms);
        } catch (error) {
            console.error("Error loading classrooms:", error);
            setLoadError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClassrooms();
    }, []);

    const handleJoin = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setJoinMessage("");
        setJoining(true);

        try {
            const response = await fetch("/api/classrooms/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ joinCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                setJoinMessage(data.error || "Could not join classroom");
                return;
            }

            setJoinMessage("Joined classroom successfully!");
            setJoinCode("");
            loadClassrooms();
        } catch (error) {
            console.error("Error joining classroom:", error);
            setJoinMessage("Something went wrong. Please try again.");
        } finally {
            setJoining(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">My Classrooms</h1>

            <form onSubmit={handleJoin} className="mt-4 flex max-w-md gap-2">
                <Input
                    placeholder="Enter join code (e.g. sq7tso)"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                />
                <Button type="submit" disabled={joining}>
                    {joining ? "Joining..." : "Join"}
                </Button>
            </form>
            {joinMessage && <p className="mt-2 text-sm text-muted-foreground">{joinMessage}</p>}

            <div className="mt-8">
                {loading && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Skeleton className="h-28 rounded-xl" />
                        <Skeleton className="h-28 rounded-xl" />
                    </div>
                )}

                {loadError && <ErrorState message={loadError} onRetry={loadClassrooms} />}

                {!loading && !loadError && classrooms.length === 0 && (
                    <EmptyState
                        icon={Building2}
                        title="No classrooms yet"
                        description="Join one using a join code from your teacher."
                    />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    {classrooms.map((classroom) => (
                        <Link key={classroom.id} href={`/student/classrooms/${classroom.id}`}>
                            <Card className="transition hover:border-primary/40 hover:shadow-md">
                                <CardContent>
                                    <p className="font-semibold">{classroom.name}</p>
                                    <p className="text-sm text-muted-foreground">{classroom.subject || "No subject"}</p>
                                    <p className="mt-2 text-xs text-muted-foreground">Teacher: {classroom.owner.email}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
