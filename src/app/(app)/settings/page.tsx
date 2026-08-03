// Settings page. There's no per-user settings model in the backend yet
// (no notification preferences, etc.), so the only real setting here is
// appearance, which is handled client-side by next-themes. Kept honest
// rather than faking toggles that don't do anything.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ThemeToggle from "@/components/theme-toggle";

export default function SettingsPage() {
    return (
        <div className="mx-auto max-w-lg">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Switch between light and dark mode.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <ThemeToggle />
                </CardContent>
            </Card>

            <p className="mt-4 text-sm text-muted-foreground">
                More account settings (notifications, etc.) aren&apos;t built on the backend yet.
            </p>
        </div>
    );
}
