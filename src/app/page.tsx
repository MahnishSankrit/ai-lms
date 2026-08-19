import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
            AI Learning Management System
          </p>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Learn, teach, create exams, and manage classrooms in one simple LMS.
          </h1>

          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            This frontend is intentionally simple. Every page uses readable
            React state, direct fetch calls, and TailwindCSS so the project is
            easy to explain in interviews.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
              Login
            </Button>

            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              Create Student Account
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
