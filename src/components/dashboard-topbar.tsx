// Top bar shown above every dashboard page, next to the sidebar.
// Has: sidebar toggle, a search box (not wired to anything yet),
// a real notifications bell, the theme toggle, and an account menu.

"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Search, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/theme-toggle";

type Notification = {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
};

export default function DashboardTopbar({ email, role }: { email: string; role: string }) {
    const initials = email.slice(0, 2).toUpperCase();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        try {
            const response = await fetch("/api/notifications");
            const data = await response.json();
            if (response.ok) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await fetch("/api/notifications/mark-read", { method: "PATCH" });
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Error marking notifications as read:", error);
        }
    };

    return (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
            <SidebarTrigger />

            <div className="relative hidden max-w-sm flex-1 md:block">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8" aria-label="Search" />
            </div>

            <div className="ml-auto flex items-center gap-1">
                <Badge variant="secondary" className="mr-1 hidden capitalize sm:inline-flex">
                    {role}
                </Badge>

                <DropdownMenu onOpenChange={(open) => open && loadNotifications()}>
                    <DropdownMenuTrigger render={
                        <button
                            aria-label="Notifications"
                            className="relative inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                        />
                    }>
                        <Bell className="size-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs font-medium text-primary hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <DropdownMenuSeparator />

                        {notifications.length === 0 ? (
                            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                                You&apos;re all caught up.
                            </p>
                        ) : (
                            <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`rounded-md px-2 py-1.5 text-sm ${
                                            notification.isRead ? "text-muted-foreground" : "bg-accent"
                                        }`}
                                    >
                                        <p className="font-medium text-foreground">{notification.title}</p>
                                        <p className="text-xs">{notification.message}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <ThemeToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger render={<button aria-label="Account menu" className="ml-1 rounded-full" />}>
                        <Avatar className="size-8">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                            {email}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem render={<Link href="/profile" />}>
                            <User />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem render={<Link href="/settings" />}>
                            <Settings />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
