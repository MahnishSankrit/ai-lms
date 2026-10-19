// Student sign-up form.
// Collects: first name, last name, username, email, password,
// student ID and phone number, then sends them to /api/register.
// The server checks everything again (never trust the browser alone).

"use client"

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function RegisterPage() {
    const router = useRouter();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [studentId, setStudentId] = useState("");
    const [phone, setPhone] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Quick checks in the browser so the student gets instant feedback.
    // Returns an error message, or "" if everything looks fine.
    const validateForm = () => {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return "Username must be 3-20 letters, numbers or _ (no spaces).";
        }
        if (password.length < 8) {
            return "Password must be at least 8 characters.";
        }
        if (!/^[0-9]{10}$/.test(phone)) {
            return "Phone number must be exactly 10 digits.";
        }
        return "";
    };

    const handleRegister = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        const formError = validateForm();
        if (formError !== "") {
            setError(formError);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ firstName, lastName, username, email, password, studentId, phone }),
            })

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            toast.success("Account created! Check your email to verify it.");
            router.push(`/login?registered=1&email=${encodeURIComponent(email)}`);
        } catch (error) {
            console.error("Error during registration:", error);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        AI Learning Management System
                    </p>
                    <CardTitle className="text-2xl">Create your student account</CardTitle>
                    <CardDescription>Takes less than a minute.</CardDescription>
                </CardHeader>

                <form onSubmit={handleRegister}>
                    <CardContent className="flex flex-col gap-4">
                        {error && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {/* First + last name side by side */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="firstName">First name</Label>
                                <Input
                                    id="firstName"
                                    placeholder="Rahul"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="lastName">Last name</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Sharma"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="rahul_21"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email address</Label>
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
                            <Label htmlFor="password">Password</Label>
                            <Input
                                type="password"
                                id="password"
                                placeholder="At least 8 characters"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Student ID + phone side by side */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="studentId">Student ID</Label>
                                <Input
                                    id="studentId"
                                    placeholder="21CS045"
                                    required
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="phone">Phone number</Label>
                                <Input
                                    type="tel"
                                    id="phone"
                                    placeholder="9876543210"
                                    required
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="mt-4 flex flex-col gap-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Creating account..." : "Register"}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-primary hover:underline">
                                Login
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </main>
    )
}
