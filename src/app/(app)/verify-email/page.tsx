"use client"

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
                    AI Learning Management System
                </p>
                <h1 className="text-2xl font-bold">Email verification</h1>

                {status === "verifying" && (
                    <div className="mt-8 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        Verifying your email...
                    </div>
                )}

                {status === "success" && (
                    <div className="mt-8 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        Your email has been verified. You can now log in.
                    </div>
                )}

                {status === "error" && (
                    <div className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <Link
                    href="/login"
                    className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                    Go to login
                </Link>
            </section>
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
