"use client"

import { useState } from "react";

import Link from "next/link";

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
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
                    AI Learning Management System
                </p>
                <h1 className="text-2xl font-bold">Reset your password</h1>

                {submitted ? (
                    <div className="mt-8 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent a
                        password reset link to that address.
                    </div>
                ) : (
                    <>
                        <p className="mt-2 text-sm text-slate-600">
                            Enter the email associated with your account and we&apos;ll send you a link to reset your
                            password.
                        </p>

                        <form onSubmit={handleForgotPassword} className="mt-8 flex flex-col gap-4">
                            {error && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Sending..." : "Send reset link"}
                            </button>
                        </form>
                    </>
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
