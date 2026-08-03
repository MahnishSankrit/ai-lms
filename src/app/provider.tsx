"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import React from "react";



export default function Providers({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                {children}
            </ThemeProvider>
        </SessionProvider>
    )
}

// this is a provider component that wraps the application with the SessionProvider from next-auth/react. It allows the application to access session information and manage authentication state. The children prop represents the components that will be rendered within this provider.