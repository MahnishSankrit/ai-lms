// Admin home page.
// Shows how many users exist, broken down by role, with a link to
// the full user management page.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
    id: string;
    role: string;
};

export default function AdminHomePage() {
    const [totalUsers, setTotalUsers] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [teacherCount, setTeacherCount] = useState(0);
    const [adminCount, setAdminCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This only counts the first page of users. Good enough for a
        // quick overview; the full breakdown is on the Users page.
        fetch("/api/users/get-all-users?limit=100")
            .then((response) => response.json())
            .then((data) => {
                if (!data.users) return;

                setTotalUsers(data.pagination.totalUsers);

                let students = 0;
                let teachers = 0;
                let admins = 0;

                for (const user of data.users as User[]) {
                    if (user.role === "student") students += 1;
                    else if (user.role === "teacher") teachers += 1;
                    else if (user.role === "admin") admins += 1;
                }

                setStudentCount(students);
                setTeacherCount(teachers);
                setAdminCount(admins);
            })
            .catch((error) => console.error("Error loading users overview:", error))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>

            {loading ? (
                <p className="mt-4 text-sm text-slate-500">Loading overview...</p>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link href="/admin/users" className="rounded-md border border-slate-200 bg-white p-5 hover:border-blue-400">
                        <p className="text-sm text-slate-500">Total users</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">{totalUsers}</p>
                    </Link>

                    <div className="rounded-md border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-500">Students</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">{studentCount}</p>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-500">Teachers</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">{teacherCount}</p>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-500">Admins</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">{adminCount}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
