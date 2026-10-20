import "./load-env";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Drops every table and removes the local embedded database directory.
 *
 * With DATABASE_URL set (Supabase) this only prints a warning — dropping a
 * hosted database from a script is never something to do by accident.
 */
async function main() {
  if (process.env.DATABASE_URL?.trim()) {
    console.error(
      "✗ DATABASE_URL is set. Refusing to reset a hosted database.\n" +
        "  Unset DATABASE_URL to reset the local embedded database instead.",
    );
    process.exit(1);
  }

  const { closeDb, getDb } = await import("../src/db/client");
  const db = await getDb();

  await db.execute(
    // Order matters: children before parents.
    `drop table if exists coupon_events cascade;
     drop table if exists coupon_categories cascade;
     drop table if exists coupons cascade;
     drop table if exists merchants cascade;
     drop table if exists categories cascade;` as never,
  );

  await closeDb();
  rmSync(resolve(process.cwd(), ".data"), { recursive: true, force: true });
  console.log("✓ local database removed. Run `npm run db:migrate && npm run db:seed`.");
}

main().catch((error) => {
  console.error("✗ reset failed:", error);
  process.exit(1);
});
