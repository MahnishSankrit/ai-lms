"use client"
import { useState } from "react";

import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ROLE_HOME: Record<string, string> = {
    admin: "/admin/dashboard",
    teacher: "/teacher/dashboard",
    student: "/student/dashboard",
};

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await signIn("credentials", { email, password, redirect: false });
            if (!response || response.error) {
                setError("Invalid email or password");
                return;
            }

            const session = await getSession();
            const role = session?.user?.role ?? "student";
            router.push(ROLE_HOME[role] ?? "/");
            router.refresh();
        } catch (error) {
            console.error("Error during login:", error);
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
                <h1 className="text-2xl font-bold">Login to your account</h1>

                <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
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

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <Link href="/forgot-password" className="text-xs font-medium text-blue-700 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="font-semibold text-blue-700 hover:underline">
                        Create one
                    </Link>
                </p>
            </section>
        </main>
    )
}
