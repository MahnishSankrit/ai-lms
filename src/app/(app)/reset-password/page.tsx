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

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleResetPassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ currToken: token, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            setSubmitted(true);
        } catch (error) {
            console.error("Error resetting password:", error);
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
                    <CardTitle className="text-2xl">Set a new password</CardTitle>
                    {token && !submitted && (
                        <CardDescription>Choose a new password for your account.</CardDescription>
                    )}
                </CardHeader>

                {!token ? (
                    <CardContent>
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            This reset link is missing a token. Request a new one from the{" "}
                            <Link href="/forgot-password" className="font-semibold underline">
                                forgot password
                            </Link>{" "}
                            page.
                        </div>
                    </CardContent>
                ) : submitted ? (
                    <CardContent>
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                            Your password has been reset. You can now log in with your new password.
                        </div>
                    </CardContent>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <CardContent className="flex flex-col gap-4">
                            {error && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="newPassword">New password</Label>
                                <Input
                                    type="password"
                                    id="newPassword"
                                    placeholder="At least 6 characters"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="confirmPassword">Confirm new password</Label>
                                <Input
                                    type="password"
                                    id="confirmPassword"
                                    placeholder="Re-enter password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </CardContent>

                        <CardFooter>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Resetting..." : "Reset password"}
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

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordContent />
        </Suspense>
    )
}
