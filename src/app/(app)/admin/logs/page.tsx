// There is no real "system logs" feature in the backend yet — no Log
// model in the database and no /api/admin/logs endpoint. Rather than
// fake one, this page is honest about that and shows the one piece of
// real activity data we do have: recently created accounts.

"use client"

import { useEffect, useState } from "react";

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
            <h1 className="text-2xl font-bold text-slate-900">Logs</h1>

            <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                There isn&apos;t a real system-logs feature built yet (no log storage in the
                database, no logs API). Below is the closest thing available right now:
                recently created accounts.
            </div>

            <h2 className="mt-8 text-lg font-semibold text-slate-900">Recent signups</h2>

            {loading && <p className="mt-2 text-sm text-slate-500">Loading...</p>}

            <div className="mt-4 flex flex-col gap-2">
                {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-sm">
                        <span className="text-slate-700">{user.email}</span>
                        <span className="capitalize text-slate-500">{user.role}</span>
                        <span className="text-slate-400">{new Date(user.createdAt).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
