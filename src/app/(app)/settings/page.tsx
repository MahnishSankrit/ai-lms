// Settings page. There's no per-user settings model in the backend yet,
// so the only real setting here is appearance, which is handled
// client-side by next-themes. Unbuilt sections are simply left out
// (rather than shown as "coming soon" notes to users).

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemePicker } from "@/components/theme-toggle";

export default function SettingsPage() {
    return (
        <div className="max-w-lg">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Choose light or dark mode, or follow your device setting.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ThemePicker />
                </CardContent>
            </Card>
        </div>
    );
}
