// This layout wraps every page under /dashboard.
// It checks if the user is logged in (using the session on the server).
// If not logged in, it redirects to /login.
// If logged in, it shows the sidebar (DashboardNav) around the page content.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardNav from "@/components/dashboard-nav";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const role = session.user.role ?? "student";
    const email = session.user.email ?? "";

    return (
        <DashboardNav role={role} email={email}>
            {children}
        </DashboardNav>
    );
}
