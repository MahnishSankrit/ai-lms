"use client"
import { useState } from "react";

import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const ROLE_HOME: any = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
};

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const registered = typeof window !== "undefined"
        && new URLSearchParams(window.location.search).get("registered") === "1";

    const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await signIn("credentials", { email, password, redirect: false });
            if (!response || response.error) {
                if (response?.error === "Email not verified") {
                    setError("Please verify your email before logging in.");
                } else if (response?.error?.startsWith("Your account is")) {
                    // suspended / inactive -- show the real reason
                    setError(response.error);
                } else {
                    setError("Invalid email or password");
                }
                return;
            }
            const session = await getSession();

            // console.log("Sign in response:", response);


            if (!session?.user) {
                setError("Login succeeded, but session was not created.");
                return;
            }

            const role = session.user.role ?? "";
            const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
            const destination = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
                ? callbackUrl
                : ROLE_HOME[role] ?? "/";

            router.replace(destination);
            router.refresh();
        } catch (error) {
            console.error("Error during login:", error);
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
                    <CardTitle className="text-2xl">Login to your account</CardTitle>
                    <CardDescription>Enter your email and password to continue.</CardDescription>
                </CardHeader>

                <form onSubmit={handleLogin}>
                    <CardContent className="flex flex-col gap-4">
                        {registered && (
                            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
                                Account created. Check your email, verify your account, then log in.
                            </div>
                        )}
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

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Logging in..." : "Login"}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="font-semibold text-primary hover:underline">
                                Create one
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </main>
    )
}
