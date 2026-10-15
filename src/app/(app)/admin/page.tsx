// Admin home page.
// Shows how many users exist, broken down by role, with a link to
// the full user management page.

"use client"

import { useEffect, useState } from "react";
import { GraduationCap, Presentation, ShieldCheck, Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/stat-card";

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
            <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>

            {loading ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard href="/admin/users" label="Total users" value={totalUsers} icon={Users} />
                    <StatCard href="/admin/users" label="Students" value={studentCount} icon={GraduationCap} />
                    <StatCard href="/admin/users" label="Teachers" value={teacherCount} icon={Presentation} />
                    <StatCard href="/admin/users" label="Admins" value={adminCount} icon={ShieldCheck} />
                </div>
            )}
        </div>
    );
}
