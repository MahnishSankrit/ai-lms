// Same idea as profile/layout.tsx: any logged-in role can visit /settings,
// wrapped in the same sidebar shell using their own role.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardNav from "@/components/dashboard-nav";

export default async function SettingsLayout({
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
