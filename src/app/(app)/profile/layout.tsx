// This layout wraps /profile and /settings, which any logged-in role
// (student, teacher, or admin) can visit. It checks the session and
// shows the same sidebar the rest of the app uses, using the current
// user's own role so the menu still matches what they normally see.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardNav from "@/components/dashboard-nav";

export default async function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <DashboardNav role={session.user.role ?? "student"} email={session.user.email ?? ""}>
            {children}
        </DashboardNav>
    );
}
