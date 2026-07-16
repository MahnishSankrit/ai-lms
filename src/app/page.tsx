import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
            AI Learning Management System
          </p>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Learn, teach, create exams, and manage classrooms in one simple LMS.
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            This frontend is intentionally simple. Every page uses readable
            React state, direct fetch calls, and TailwindCSS so the project is
            easy to explain in interviews.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Create Student Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
