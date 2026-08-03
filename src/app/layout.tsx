import type { Metadata } from "next";
import "./globals.css";
import Providers from "./provider";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "AI LMS",
  description: "A simple full stack AI learning management system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

// by using this provider component, the application can access session information and manage authentication state throughout the entire app. The children prop represents the components that will be rendered within this provider, allowing them to access the session context provided by next-auth/react.

