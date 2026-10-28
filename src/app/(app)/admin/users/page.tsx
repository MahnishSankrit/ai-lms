// Lists every user in the system, with controls to change their
// account status (active / inactive / suspended) or delete them.
// Also has a dialog to invite a new teacher by email.

"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Copy, Mail, Users as UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";

type User = {
    id: string;
    email: string;
    role: string;
    status: string;
    isVerified: boolean;
    createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
};

export default function AdminUsersPage() {
    const { data: session } = useSession();

    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteLink, setInviteLink] = useState("");
    const [inviteEmailSent, setInviteEmailSent] = useState(true);

    const loadUsers = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`/api/users/get-all-users?page=${page}&limit=10`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load users");
                return;
            }

            setUsers(data.users);
            setTotalPages(data.pagination.totalPages);
        } catch (err) {
            console.error("Error loading users:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleStatusChange = async (userId: string, status: string) => {
        try {
            const response = await fetch("/api/users/status", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: userId, status }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not update status");
                return;
            }

            toast.success("Status updated");
            loadUsers();
        } catch (err) {
            console.error("Error updating status:", err);
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Delete this user? This cannot be undone.")) return;

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not delete user");
                return;
            }

            // Users with exam/classroom history are deactivated, not deleted
            if (data.deactivated) {
                toast.success(data.message);
            } else {
                toast.success("User deleted");
            }
            loadUsers();
        } catch (err) {
            console.error("Error deleting user:", err);
        }
    };

    // Manually mark a user's email as verified (e.g. their email never arrived)
    const handleVerify = async (userId: string) => {
        try {
            const response = await fetch("/api/users/verify", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: userId }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not verify user");
                return;
            }

            toast.success("User verified");
            loadUsers();
        } catch (err) {
            console.error("Error verifying user:", err);
            toast.error("Something went wrong. Please try again.");
        }
    };

    const openInviteDialog = () => {
        setInviteEmail("");
        setInviteLink("");
        setInviteOpen(true);
    };

    const handleInvite = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setInviting(true);
        setInviteLink("");

        try {
            const response = await fetch("/api/teacher-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Could not send invite");
                return;
            }

            setInviteLink(data.inviteLink);
            setInviteEmailSent(data.emailSent);
        } catch (err) {
            console.error("Error inviting teacher:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setInviting(false);
        }
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink);
        toast.success("Link copied");
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Users</h1>

                <Button size="sm" onClick={openInviteDialog}>
                    <Mail /> Invite Teacher
                </Button>

                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite a teacher</DialogTitle>
                        </DialogHeader>

                        {inviteLink ? (
                            <div className="flex flex-col gap-3">
                                <p className="text-sm text-muted-foreground">
                                    {inviteEmailSent
                                        ? "Invite email sent. You can also share this link directly:"
                                        : "The invite email couldn't be sent, but you can share this link directly:"}
                                </p>
                                <div className="flex gap-2">
                                    <Input readOnly value={inviteLink} />
                                    <Button type="button" variant="outline" size="icon" onClick={copyInviteLink}>
                                        <Copy />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Expires in 7 days.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleInvite} className="flex flex-col gap-3">
                                <Label htmlFor="inviteEmail">Teacher&apos;s email</Label>
                                <Input
                                    id="inviteEmail"
                                    type="email"
                                    required
                                    placeholder="teacher@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={inviting}>
                                        {inviting ? "Sending..." : "Send invite"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="mt-6">
                {loading && <Skeleton className="h-64 w-full rounded-xl" />}
                {error && <ErrorState message={error} onRetry={loadUsers} />}

                {!loading && !error && users.length === 0 && (
                    <EmptyState icon={UsersIcon} title="No users" description="Nothing to show yet." />
                )}

                {!loading && !error && users.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Verified</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => {
                                const isSelf = session?.user?.id === user.id;

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{user.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={user.isVerified ? "default" : "secondary"}>
                                                    {user.isVerified ? "Verified" : "Not verified"}
                                                </Badge>
                                                {!user.isVerified && (
                                                    <Button variant="outline" size="sm" onClick={() => handleVerify(user.id)}>
                                                        Verify
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {/* value = the user's current status, so the admin can see it;
                                                disabled for your own row (the API blocks it too) */}
                                            <Select
                                                items={STATUS_LABELS}
                                                value={user.status}
                                                disabled={isSelf}
                                                onValueChange={(value: string | null) => {
                                                    if (value && value !== user.status) handleStatusChange(user.id, value);
                                                }}
                                            >
                                                <SelectTrigger className="w-36">
                                                    <SelectValue placeholder="Set status..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                    <SelectItem value="suspended">Suspended</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(user.id)}
                                                disabled={isSelf}
                                                className="text-destructive"
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}

                {!loading && !error && totalPages > 1 && (
                    <div className="mt-4 flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
