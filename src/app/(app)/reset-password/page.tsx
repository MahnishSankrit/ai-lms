"use client"

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
                    AI Learning Management System
                </p>
                <h1 className="text-2xl font-bold">Set a new password</h1>

                {!token ? (
                    <div className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        This reset link is missing a token. Request a new one from the{" "}
                        <Link href="/forgot-password" className="font-semibold underline">
                            forgot password
                        </Link>{" "}
                        page.
                    </div>
                ) : submitted ? (
                    <div className="mt-8 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        Your password has been reset. You can now log in with your new password.
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} className="mt-8 flex flex-col gap-4">
                        {error && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                                New password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                placeholder="At least 6 characters"
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                                Confirm new password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                placeholder="Re-enter password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Resetting..." : "Reset password"}
                        </button>
                    </form>
                )}

                <p className="mt-6 text-center text-sm text-slate-600">
                    Remembered your password?{" "}
                    <Link href="/login" className="font-semibold text-blue-700 hover:underline">
                        Login
                    </Link>
                </p>
            </section>
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
