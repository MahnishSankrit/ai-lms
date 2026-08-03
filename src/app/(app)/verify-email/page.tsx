"use client"

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
    const [error, setError] = useState(token ? "" : "This verification link is missing a token.");

    useEffect(() => {
        if (!token) return;

        fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                    setError(data.error || "Invalid or expired verification link.");
                    setStatus("error");
                    return;
                }
                setStatus("success");
            })
            .catch(() => {
                setError("Something went wrong. Please try again.");
                setStatus("error");
            });
    }, [token]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        AI Learning Management System
                    </p>
                    <CardTitle className="text-2xl">Email verification</CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                    {status === "verifying" && (
                        <div className="rounded-md border bg-muted px-4 py-3 text-sm text-muted-foreground">
                            Verifying your email...
                        </div>
                    )}

                    {status === "success" && (
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                            Your email has been verified. You can now log in.
                        </div>
                    )}

                    {status === "error" && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <Button render={<Link href="/login" />}>Go to login</Button>
                </CardContent>
            </Card>
        </main>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailContent />
        </Suspense>
    )
}
