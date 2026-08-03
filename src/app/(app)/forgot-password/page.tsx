"use client"

import { useState } from "react";

import Link from "next/link";

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

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleForgotPassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || "Something went wrong");
                return;
            }

            setSubmitted(true);
        } catch (error) {
            console.error("Error requesting password reset:", error);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        AI Learning Management System
                    </p>
                    <CardTitle className="text-2xl">Reset your password</CardTitle>
                    {!submitted && (
                        <CardDescription>
                            Enter the email associated with your account and we&apos;ll send you a link to reset your
                            password.
                        </CardDescription>
                    )}
                </CardHeader>

                {submitted ? (
                    <CardContent>
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                            If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent a
                            password reset link to that address.
                        </div>
                    </CardContent>
                ) : (
                    <form onSubmit={handleForgotPassword}>
                        <CardContent className="flex flex-col gap-4">
                            {error && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    type="email"
                                    id="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </CardContent>

                        <CardFooter>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Sending..." : "Send reset link"}
                            </Button>
                        </CardFooter>
                    </form>
                )}

                <p className="pb-6 text-center text-sm text-muted-foreground">
                    Remembered your password?{" "}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Login
                    </Link>
                </p>
            </Card>
        </main>
    )
}
