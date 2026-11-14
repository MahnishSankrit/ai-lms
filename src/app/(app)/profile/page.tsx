// The logged-in user's profile.
//
// Layout:
//   [ Avatar  Name · role · Verified ]                 <- header card, full width
//   [ Account info ]        [ Security ]               <- 2 columns (1 on phones)
//
// - Account info: read-only details (name, username, phone, Student ID for
//   students only) plus the email, which can be changed with its own Save.
//   Changing the email logs the user out until they verify the new one.
// - Security: change password, with its own Save button.
// Both saves need the current password (the API checks it).

"use client"

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import PageHeader from "@/components/page-header";
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

// One read-only "label: value" item in the Account info card.
function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm">{value || "—"}</dd>
        </div>
    );
}

export default function ProfilePage() {
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Account card (email change)
    const [email, setEmail] = useState("");
    const [emailPassword, setEmailPassword] = useState("");
    const [savingEmail, setSavingEmail] = useState(false);
    const [emailError, setEmailError] = useState("");

    // Security card (password change)
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");

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

    // Sends a change to /api/users/profile. Returns the response data, or null on failure.
    const updateProfile = async (body: { email: string; currentPassword: string; newPassword?: string }) => {
        const response = await fetch("/api/users/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return { ok: response.ok, data };
    };

    const handleSaveEmail = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setEmailError("");

        if (me && email === me.email) {
            setEmailError("That's already your email.");
            return;
        }

        setSavingEmail(true);
        try {
            const { ok, data } = await updateProfile({ email, currentPassword: emailPassword });

            if (!ok) {
                setEmailError(data.error || "Could not update email");
                return;
            }

            // Email changed: the account is unverified now, so log out.
            toast.success("Check your new inbox for a verification link, then log in again.");
            signOut({ callbackUrl: "/login" });
        } catch (err) {
            console.error("Error updating email:", err);
            setEmailError("Something went wrong. Please try again.");
        } finally {
            setSavingEmail(false);
        }
    };

    const handleSavePassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError("");

        // Check the form before sending anything to the server.
        if (newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New password and confirmation don't match.");
            return;
        }
        if (!me) return;

        setSavingPassword(true);
        try {
            // the API needs the email too; send the current one unchanged
            const { ok, data } = await updateProfile({ email: me.email, currentPassword, newPassword });

            if (!ok) {
                setPasswordError(data.error || "Could not change password");
                return;
            }

            toast.success("Password changed");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.error("Error changing password:", err);
            setPasswordError("Something went wrong. Please try again.");
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="grid gap-6 lg:grid-cols-2">
                    <Skeleton className="h-72 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
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

    // Name for the header: "First Last", else username, else the email.
    const firstName = me.profile?.firstName ?? "";
    const lastName = me.profile?.lastName ?? "";
    let displayName = `${firstName} ${lastName}`.trim();
    if (displayName === "") displayName = me.profile?.username || me.email;

    let initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    if (initials === "") initials = me.email.slice(0, 2).toUpperCase();

    return (
        <div>
            <PageHeader title="Profile" />

            {/* Header card, full width */}
            <Card>
                <CardContent className="flex flex-wrap items-center gap-4">
                    <Avatar className="size-14">
                        <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold">{displayName}</p>
                        <p className="truncate text-sm text-muted-foreground">{me.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="capitalize">{me.role}</Badge>
                        <Badge variant={me.isVerified ? "default" : "outline"}>
                            {me.isVerified ? "Verified" : "Not verified"}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
                {/* Account info: read-only details + email change */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="size-4" /> Account info
                        </CardTitle>
                        <CardDescription>Member since {formatIndianDate(me.createdAt)}</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <InfoItem label="First name" value={me.profile?.firstName} />
                            <InfoItem label="Last name" value={me.profile?.lastName} />
                            <InfoItem label="Username" value={me.profile?.username} />
                            <InfoItem label="Phone" value={me.profile?.phone} />
                            {/* Student ID only means something for students */}
                            {me.role === "student" && <InfoItem label="Student ID" value={me.profile?.studentId} />}
                        </dl>
                    </CardContent>

                    <form onSubmit={handleSaveEmail}>
                        <CardContent className="flex flex-col gap-4 border-t pt-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {/* only ask for the password once the email has actually changed */}
                            {email !== me.email && (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="emailPassword">Current password</Label>
                                        <Input
                                            id="emailPassword"
                                            type="password"
                                            required
                                            value={emailPassword}
                                            onChange={(e) => setEmailPassword(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        You&apos;ll need to verify the new email and log in again.
                                    </p>
                                </>
                            )}

                            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                        </CardContent>

                        {email !== me.email && (
                            <CardFooter className="mt-4 justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEmail(me.email)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={savingEmail}>
                                    {savingEmail ? "Saving..." : "Save email"}
                                </Button>
                            </CardFooter>
                        )}
                    </form>
                </Card>

                {/* Security: change password */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <KeyRound className="size-4" /> Security
                        </CardTitle>
                        <CardDescription>Change your password.</CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSavePassword}>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="currentPassword">Current password</Label>
                                <Input
                                    id="currentPassword"
                                    type={passwordInputType}
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="newPassword">New password</Label>
                                <Input
                                    id="newPassword"
                                    type={passwordInputType}
                                    required
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

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="confirmPassword">Confirm new password</Label>
                                <Input
                                    id="confirmPassword"
                                    type={passwordInputType}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
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

                            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                        </CardContent>

                        <CardFooter className="mt-4 justify-end">
                            <Button type="submit" disabled={savingPassword}>
                                {savingPassword ? "Saving..." : "Change password"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
