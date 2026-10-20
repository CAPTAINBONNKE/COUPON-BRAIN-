import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import * as schema from "./schema";

/**
 * The single database handle for the whole application.
 *
 * DRIVER SELECTION
 *   DATABASE_URL set   → postgres.js → Supabase (session/transaction pooler).
 *   DATABASE_URL unset → PGlite, an embedded Postgres (WASM) stored in ./.data.
 *
 * Both speak identical PostgreSQL, so the schema, migrations and every query
 * behave the same. There is exactly ONE schema and ONE set of migrations; the
 * local database is a development/QA convenience, never a second source of
 * truth. Setting DATABASE_URL is all that is required to move to Supabase.
 */

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const LOCAL_DATA_DIR = ".data/pglite";

type Cache = { db?: Database; client?: unknown };

/**
 * Next.js dev server hot-reloads modules; without a global cache every reload
 * would open a brand-new PGlite instance against the same data directory.
 */
const globalCache = globalThis as unknown as { __couponBrainDb?: Cache };
const cache: Cache = (globalCache.__couponBrainDb ??= {});

async function createDb(): Promise<Database> {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, {
      // Supabase pooler: prepared statements are not supported on port 6543.
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: /supabase\.(co|com)|sslmode=require/.test(url) ? "require" : undefined,
    });
    cache.client = client;
    return drizzle(client, { schema }) as unknown as Database;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  // PGlite creates only the leaf directory, so make sure the parent exists.
  mkdirSync(resolve(process.cwd(), LOCAL_DATA_DIR), { recursive: true });
  const client = new PGlite(LOCAL_DATA_DIR);
  await client.waitReady;
  cache.client = client;
  return drizzle(client, { schema }) as unknown as Database;
}

/**
 * Lazy singleton. Importing this module never touches the database — the
 * connection is opened on first query, which keeps `next build` safe.
 */
export async function getDb(): Promise<Database> {
  if (!cache.db) cache.db = await createDb();
  return cache.db;
}

/** Synchronous escape hatch for code paths that already awaited `getDb()`. */
export function getDbCached(): Database | undefined {
  return cache.db;
}

export async function closeDb(): Promise<void> {
  const client = cache.client;
  cache.db = undefined;
  cache.client = undefined;
  if (!client) return;
  const maybeClose = client as { close?: () => Promise<void> | void; end?: () => Promise<void> | void };
  if (typeof maybeClose.close === "function") await maybeClose.close();
  else if (typeof maybeClose.end === "function") await maybeClose.end();
}

export { schema };

export const usingSupabase = () => Boolean(process.env.DATABASE_URL?.trim());
