"use client"

import { useState } from "react";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    // Not sent to the backend yet — /api/register only stores email + password.
    // Kept here so it's ready once a profile/displayName field is wired up.
    const [name, setName] = useState("");

    const handleRegister = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            // automatically log in the user after successful registration
            const login = await signIn("credentials", { email, password, redirect: false });

            if (!login || login.error) {
                setError("Registration successful, but login failed. Please try logging in.");
                return;
            }

            router.push("/student/dashboard");
            router.refresh();
        } catch (error) {
            console.error("Error during registration:", error);
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
                <h1 className="text-2xl font-bold">Create your student account</h1>

                <form onSubmit={handleRegister} className="mt-8 flex flex-col gap-4">
                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className="text-sm font-medium text-slate-700">
                            Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            placeholder="Your name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

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
                        <label htmlFor="password" className="text-sm font-medium text-slate-700">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            placeholder="At least 6 characters"
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
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-blue-700 hover:underline">
                        Login
                    </Link>
                </p>
            </section>
        </main>
    )
}