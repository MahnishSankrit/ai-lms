// Public page a teacher lands on after clicking their invite email link.
// Reads the invite token from the URL and lets them set a name + password
// to finish creating their teacher account.

"use client"

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

function AcceptInviteContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/teacher-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, name, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Could not complete registration");
                return;
            }

            setDone(true);
        } catch (err) {
            console.error("Error accepting teacher invite:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        AI Learning Management System
                    </p>
                    <CardTitle className="text-2xl">Set up your teacher account</CardTitle>
                    {!done && <CardDescription>You were invited by an admin to join as a teacher.</CardDescription>}
                </CardHeader>

                {!token ? (
                    <CardContent>
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            This invite link is missing a token. Ask your admin to send a new one.
                        </div>
                    </CardContent>
                ) : done ? (
                    <CardContent>
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                            Your account is ready. You can log in now.
                        </div>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardContent className="flex flex-col gap-4">
                            {error && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="name">Your name</Label>
                                <Input
                                    id="name"
                                    required
                                    minLength={3}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="password">Choose a password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </CardContent>

                        <CardFooter>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Creating account..." : "Create account"}
                            </Button>
                        </CardFooter>
                    </form>
                )}

                <p className="pb-6 text-center text-sm text-muted-foreground">
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Go to login
                    </Link>
                </p>
            </Card>
        </main>
    );
}

export default function AcceptTeacherInvitePage() {
    return (
        <Suspense>
            <AcceptInviteContent />
        </Suspense>
    );
}
