// Top bar shown above every dashboard page, next to the sidebar.
// Has: sidebar toggle, a search box (not wired to anything yet),
// a notifications bell, the theme toggle, and an account menu.

"use client"

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

export default function DashboardTopbar({ email, role }: { email: string; role: string }) {
    const initials = email.slice(0, 2).toUpperCase();

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

                <DropdownMenu>
                    <DropdownMenuTrigger render={
                        <button
                            aria-label="Notifications"
                            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                        />
                    }>
                        <Bell className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                            You&apos;re all caught up.
                        </p>
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
