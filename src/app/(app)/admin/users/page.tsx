// Lists every user in the system, with controls to change their
// account status (active / inactive / suspended) or delete them.

"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type User = {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
};

export default function AdminUsersPage() {
    const { data: session } = useSession();

    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

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
        setMessage("");

        try {
            const response = await fetch("/api/users/status", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: userId, status }),
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Could not update status");
                return;
            }

            loadUsers();
        } catch (err) {
            console.error("Error updating status:", err);
            setMessage("Something went wrong. Please try again.");
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
                setMessage(data.error || "Could not delete user");
                return;
            }

            loadUsers();
        } catch (err) {
            console.error("Error deleting user:", err);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Users</h1>

            {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

            <div className="mt-6">
                {loading && <p className="text-sm text-slate-500">Loading users...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex flex-col gap-2">
                    {users.map((user) => {
                        const isSelf = session?.user?.id === user.id;

                        return (
                            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4">
                                <div>
                                    <p className="font-medium text-slate-900">{user.email}</p>
                                    <p className="text-xs text-slate-500 capitalize">
                                        {user.role} · {user.isVerified ? "verified" : "not verified"}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <select
                                        defaultValue=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleStatusChange(user.id, e.target.value);
                                                e.target.value = "";
                                            }
                                        }}
                                        className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-600"
                                    >
                                        <option value="" disabled>
                                            Set status...
                                        </option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="suspended">Suspended</option>
                                    </select>

                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        disabled={isSelf}
                                        className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-500">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
