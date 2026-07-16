import { createSwaggerSpec } from "next-swagger-doc";

export function getApiDocs() {
    return createSwaggerSpec({
        definition: {
            openapi: "3.0.0",
            info: {
                title: "AI LMS API",
                version: "1.0",
                description:
                    "Documentation for AI LMS APIs.\n\n" +
                    "**Authentication:** this API uses a session cookie (NextAuth JWT), not a Bearer token. " +
                    "Click **Try it out** on `POST /api/login` first — the browser will store the `next-auth.session-token` " +
                    "cookie automatically, and every subsequent **Try it out** call on this page (same origin) will include it. " +
                    "There is nothing to paste into the Authorize dialog.",
            },
            servers: [
                {
                    url: "http://localhost:3000",
                },
            ],
            tags: [
                { name: "Auth", description: "Registration, login, verification, password reset, teacher onboarding" },
                { name: "Classrooms", description: "Classroom CRUD, membership, announcements" },
                { name: "Exams", description: "Exam CRUD and lifecycle (draft → published → ongoing → completed)" },
                { name: "Exam Questions", description: "Attaching/ordering questions on an exam" },
                { name: "Questions", description: "Teacher question bank" },
                { name: "AI", description: "PDF extraction and AI question generation" },
                { name: "Attempts", description: "Student exam-taking flow" },
                { name: "Results", description: "Grading, results and analytics" },
                { name: "Users", description: "Account/profile/admin user management" },
            ],
            components: {
                securitySchemes: {
                    cookieAuth: {
                        type: "apiKey",
                        in: "cookie",
                        name: "next-auth.session-token",
                        description:
                            "Session cookie set by POST /api/login. Use Try it out on that endpoint first.",
                    },
                },
            },
        },
        apiFolder: "src/app/api",
    });
}