// There is no real "system logs" feature in the backend yet — no Log
// model in the database and no /api/admin/logs endpoint. Rather than
// fake one, this page is honest about that and shows the one piece of
// real activity data we do have: recently created accounts.

"use client"

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type User = {
    id: string;
    email: string;
    role: string;
    createdAt: string;
};

export default function AdminLogsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/users/get-all-users?limit=20")
            .then((response) => response.json())
            .then((data) => {
                if (data.users) {
                    setUsers(data.users);
                }
            })
            .catch((error) => console.error("Error loading recent signups:", error))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Logs</h1>

            <h2 className="mt-6 text-lg font-semibold">Recent signups</h2>

            {loading && (
                <div className="mt-4 flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-11 w-full rounded-md" />
                    ))}
                </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
                {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm">
                        <span className="text-foreground">{user.email}</span>
                        <span className="capitalize text-muted-foreground">{user.role}</span>
                        <span className="text-muted-foreground">{new Date(user.createdAt).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
