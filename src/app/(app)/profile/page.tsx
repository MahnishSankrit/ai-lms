// Shows the logged-in user's account info, and a form to change their
// email and/or password. Any change needs the current password.
// If the email changes, the user is logged out until they verify the new one.

"use client"

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

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
import { formatIndianDate } from "@/lib/format-date";

type Me = {
    email: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
    // null for accounts created before these fields existed
    profile: {
        firstName: string | null;
        lastName: string | null;
        username: string | null;
        studentId: string | null;
        phone: string | null;
    } | null;
};

// Gives the password a score from 0 to 4: one point for each rule it passes.
function getPasswordScore(password: string) {
    let score = 0;
    if (password.length >= 8) score = score + 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score = score + 1; // upper AND lower case
    if (/[0-9]/.test(password)) score = score + 1;
    if (/[^A-Za-z0-9]/.test(password)) score = score + 1; // a symbol like ! or @
    return score;
}

function getStrengthLabel(score: number) {
    if (score <= 1) return "Weak";
    if (score === 2) return "Fair";
    if (score === 3) return "Good";
    return "Strong";
}

function getStrengthColor(score: number) {
    if (score <= 1) return "bg-destructive";
    if (score === 2) return "bg-orange-500";
    if (score === 3) return "bg-yellow-500";
    return "bg-green-500";
}

export default function ProfilePage() {
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

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
        setFormError("");

        // Check the form before sending anything to the server.
        if (newPassword !== "" && newPassword.length < 8) {
            setFormError("New password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setFormError("New password and confirmation don't match.");
            return;
        }
        if (me && email === me.email && newPassword === "") {
            setFormError("Nothing to save — change your email or enter a new password.");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    currentPassword: currentPassword,
                    newPassword: newPassword || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setFormError(data.error || "Could not update profile");
                return;
            }

            // Email changed: the account is unverified now, so log out.
            if (data.emailChanged) {
                toast.success("Check your new inbox for a verification link, then log in again.");
                signOut({ callbackUrl: "/login" });
                return;
            }

            toast.success("Profile updated");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            loadMe();
        } catch (err) {
            console.error("Error updating profile:", err);
            setFormError("Something went wrong. Please try again.");
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

    const passwordScore = getPasswordScore(newPassword);

    // "password" hides the text, "text" shows it.
    let passwordInputType = "password";
    if (showPasswords) {
        passwordInputType = "text";
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
                        Member since {formatIndianDate(me.createdAt)}
                    </CardDescription>
                </CardHeader>

                {/* Personal details from sign-up ("—" if not set) */}
                <CardContent>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                            <dt className="text-xs text-muted-foreground">First name</dt>
                            <dd>{me.profile?.firstName || "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Last name</dt>
                            <dd>{me.profile?.lastName || "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Username</dt>
                            <dd>{me.profile?.username || "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Student ID</dt>
                            <dd>{me.profile?.studentId || "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Phone</dt>
                            <dd>{me.profile?.phone || "—"}</dd>
                        </div>
                    </dl>
                </CardContent>

                <form onSubmit={handleSave}>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {email !== me.email && (
                                <p className="text-xs text-muted-foreground">
                                    You&apos;ll need to verify the new email and log in again.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="newPassword">New password</Label>
                            <Input
                                id="newPassword"
                                type={passwordInputType}
                                placeholder="Leave blank to keep current password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />

                            {/* Strength meter: 4 bars, one filled per rule passed */}
                            {newPassword !== "" && (
                                <div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((bar) => (
                                            <div
                                                key={bar}
                                                className={`h-1.5 flex-1 rounded-full ${
                                                    bar <= passwordScore ? getStrengthColor(passwordScore) : "bg-muted"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Strength: {getStrengthLabel(passwordScore)} — use 8+ characters with
                                        upper &amp; lower case, a number and a symbol.
                                    </p>
                                </div>
                            )}
                        </div>

                        {newPassword !== "" && (
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="confirmPassword">Confirm new password</Label>
                                <Input
                                    id="confirmPassword"
                                    type={passwordInputType}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="currentPassword">Current password</Label>
                            <Input
                                id="currentPassword"
                                type={passwordInputType}
                                required
                                placeholder="Required to save any change"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="flex items-center gap-1.5 self-start text-xs font-medium text-primary hover:underline"
                        >
                            {showPasswords ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            {showPasswords ? "Hide passwords" : "Show passwords"}
                        </button>

                        {formError && <p className="text-sm text-destructive">{formError}</p>}
                    </CardContent>

                    <CardFooter className="mt-4">
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : "Save changes"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
