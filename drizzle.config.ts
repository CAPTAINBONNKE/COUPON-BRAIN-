import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit only needs credentials for `push` / `studio`.
 * `generate` works purely from the schema in src/db/schema.ts, so the app can be
 * developed (and migrations authored) without a live database.
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres",
  },
  strict: true,
  verbose: true,
} satisfies Config;
