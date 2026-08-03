// This layout wraps every page under /student.
// It checks that someone is logged in AND that they are a student
// (a teacher or admin trying to open /student gets sent back to /dashboard).
// If everything is fine, it shows the sidebar (DashboardNav) around the page.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardNav from "@/components/dashboard-nav";

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "student") {
        redirect("/dashboard");
    }

    return (
        <DashboardNav role="student" email={session.user.email ?? ""}>
            {children}
        </DashboardNav>
    );
}
