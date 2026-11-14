// Settings page. There's no per-user settings model in the backend yet,
// so the only real setting here is appearance, which is handled
// client-side by next-themes. Unbuilt sections are simply left out
// (rather than shown as "coming soon" notes to users).

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemePicker } from "@/components/theme-toggle";

import PageHeader from "@/components/page-header";
export default function SettingsPage() {
    return (
        <div>
            <PageHeader title="Settings" />

            <Card>
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
