// Shows the logged-in user's account info, and a small form to
// change their email and/or password.

"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/error-state";

type Me = {
    email: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
};

export default function ProfilePage() {
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const loadMe = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/users/me");
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load profile");
                return;
            }

            setMe(data.user);
            setEmail(data.user.email);
        } catch (err) {
            console.error("Error loading profile:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMe();
    }, []);

    const handleSave = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");
        setSaving(true);

        try {
            const response = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password: password || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not update profile");
                return;
            }

            setMessage("Profile updated.");
            setPassword("");
            loadMe();
        } catch (err) {
            console.error("Error updating profile:", err);
            setMessage("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex max-w-lg flex-col gap-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    if (error || !me) {
        return <ErrorState message={error || "Profile not found"} onRetry={loadMe} />;
    }

    return (
        <div className="max-w-lg">
            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle>Account</CardTitle>
                        <Badge variant="secondary" className="capitalize">{me.role}</Badge>
                        <Badge variant={me.isVerified ? "default" : "outline"}>
                            {me.isVerified ? "Verified" : "Not verified"}
                        </Badge>
                    </div>
                    <CardDescription>
                        Member since {new Date(me.createdAt).toLocaleDateString()}
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSave}>
                    <CardContent className="flex flex-col gap-4">
                        {message && <p className="text-sm text-muted-foreground">{message}</p>}

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password">New password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Leave blank to keep current password"
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : "Save changes"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
