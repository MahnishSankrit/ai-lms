// A button that switches between light and dark mode.
// Uses next-themes, which reads/writes the "theme" preference and adds
// the .dark class to <html> that our globals.css color variables react to.

"use client"

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();

    // Avoids a light/dark mismatch between server and first client render.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;
    }

    const isDark = resolvedTheme === "dark";

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
        >
            {isDark ? <Sun /> : <Moon />}
        </Button>
    );
}

// Three-way picker used on the Settings page: Light / Dark / System.
// "System" follows the operating system's dark-mode setting, which the
// quick toggle button in the top bar can't express.
const THEME_OPTIONS = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
];

export function ThemePicker() {
    const { theme, setTheme } = useTheme();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = mounted && theme === option.value;
                return (
                    <Button
                        key={option.value}
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTheme(option.value)}
                    >
                        <Icon /> {option.label}
                    </Button>
                );
            })}
        </div>
    );
}
