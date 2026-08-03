// This page has no UI of its own.
// It just checks the logged-in user's role and sends them
// to the correct dashboard: /admin, /teacher, or /student.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (role === "admin") {
        redirect("/admin");
    } else if (role === "teacher") {
        redirect("/teacher");
    } else if (role === "student") {
        redirect("/student");
    } else {
        redirect("/login");
    }
}
