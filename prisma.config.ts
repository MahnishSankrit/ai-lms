// Prisma CLI config (used by `prisma migrate`, `prisma generate`, etc.).
// The secrets live in .env.local (same file Next.js reads), so load that.
// Migrations use DIRECT_URL (Supabase port 5432) because the pooled
// DATABASE_URL (port 6543, pgbouncer) can't run migrations.
// The app itself still uses DATABASE_URL -- see src/lib/prisma.ts.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
