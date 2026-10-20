import "./load-env";

const MIGRATIONS_FOLDER = "./db/migrations";

async function main() {
  const { closeDb, getDb, usingSupabase } = await import("../src/db/client");
  const db = await getDb();

  console.log(
    `→ migrating ${usingSupabase() ? "Supabase (DATABASE_URL)" : "local embedded Postgres (.data/pglite)"}`,
  );

  if (usingSupabase()) {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
  }

  console.log("✓ migrations applied");
  await closeDb();
}

main().catch((error) => {
  console.error("✗ migration failed:", error);
  process.exit(1);
});
