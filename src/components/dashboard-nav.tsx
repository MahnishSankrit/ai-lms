// Sidebar + topbar shell shown on every dashboard page (admin/teacher/student).
// Built with shadcn/ui's Sidebar components. Shows different links depending
// on the user's role.

"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    BookOpen,
    Building2,
    CalendarClock,
    FileText,
    History,
    LayoutDashboard,
    ScrollText,
    Settings,
    Sparkles,
    User,
    Users,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
import DashboardTopbar from "@/components/dashboard-topbar";

function getLinksForRole(role: string) {
    if (role === "admin") {
        return [
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/logs", label: "Logs", icon: ScrollText },
            { href: "/profile", label: "Profile", icon: User },
            { href: "/settings", label: "Settings", icon: Settings },
        ];
    }

    if (role === "teacher") {
        return [
            { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
            { href: "/teacher/classrooms", label: "Classrooms", icon: Building2 },
            { href: "/teacher/questions", label: "Question Bank", icon: BookOpen },
            { href: "/teacher/ai", label: "AI Generator", icon: Sparkles },
            { href: "/teacher/exams", label: "Exams", icon: FileText },
            { href: "/teacher/results", label: "Results", icon: BarChart3 },
            { href: "/profile", label: "Profile", icon: User },
            { href: "/settings", label: "Settings", icon: Settings },
        ];
    }

    // default: student links
    return [
        { href: "/student", label: "Dashboard", icon: LayoutDashboard },
        { href: "/student/classrooms", label: "My Classrooms", icon: Building2 },
        { href: "/student/exams", label: "Upcoming Exams", icon: CalendarClock },
        { href: "/student/attempts", label: "Attempt History", icon: History },
        { href: "/student/results", label: "Results", icon: BarChart3 },
        { href: "/profile", label: "Profile", icon: User },
        { href: "/settings", label: "Settings", icon: Settings },
    ];
}

export default function DashboardNav({
    email,
    role,
    children,
}: {
    email: string;
    role: string;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const links = getLinksForRole(role);

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="flex flex-col gap-0.5 px-2 py-1.5">
                        <span className="text-sm font-semibold tracking-tight">AI LMS</span>
                        <span className="text-xs capitalize text-muted-foreground">{role} dashboard</span>
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Menu</SidebarGroupLabel>
                        <SidebarMenu>
                            {links.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <SidebarMenuItem key={link.href}>
                                        <SidebarMenuButton
                                            isActive={pathname === link.href}
                                            render={<Link href={link.href} />}
                                        >
                                            <Icon />
                                            {link.label}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            <SidebarInset>
                <DashboardTopbar email={email} role={role} />
                <div className="flex-1 p-6">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
