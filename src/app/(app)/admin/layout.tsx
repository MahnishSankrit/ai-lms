// This layout wraps every page under /admin.
// It checks that someone is logged in AND that they are an admin
// (a student or teacher trying to open /admin gets sent back to /dashboard).
// If everything is fine, it shows the sidebar (DashboardNav) around the page.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardNav from "@/components/dashboard-nav";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "admin") {
        redirect("/dashboard");
    }

    return (
        <DashboardNav role="admin" email={session.user.email ?? ""}>
            {children}
        </DashboardNav>
    );
}
