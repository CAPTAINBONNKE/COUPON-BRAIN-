import "./load-env";

import { sql } from "drizzle-orm";

/**
 * Rebuilds the denormalised popularity counters on `coupons` from
 * `coupon_events`.
 *
 * The counters are a CACHE; the events table is the source of truth. If they
 * ever disagree (a failed transaction, a manual data fix, an import), this
 * script makes the cache agree with the source again. Safe to run at any time.
 */
async function main() {
  const { closeDb, getDb } = await import("../src/db/client");
  const { couponEvents, coupons } = await import("../src/db/schema");

  const db = await getDb();

  console.log("→ rebuilding counters from coupon_events…");

  // Reset first: a coupon with no events must end at zero, not keep stale value.
  await db.execute(sql`
    update ${coupons}
       set view_count = 0, copy_count = 0, click_count = 0
  `);

  await db.execute(sql`
    update ${coupons} c
       set view_count = coalesce(t.views, 0),
           copy_count = coalesce(t.copies, 0),
           click_count = coalesce(t.clicks, 0),
           updated_at = now()
      from (
        select coupon_id,
               count(*) filter (where type = 'view')  as views,
               count(*) filter (where type = 'copy')  as copies,
               count(*) filter (where type = 'click') as clicks
          from ${couponEvents}
         where coupon_id is not null
         group by coupon_id
      ) t
     where t.coupon_id = c.id
  `);

  const totals = await db.execute(sql`
    select
      coalesce(sum(view_count), 0)  as views,
      coalesce(sum(copy_count), 0)  as copies,
      coalesce(sum(click_count), 0) as clicks
    from ${coupons}
  `);

  const rows = Array.isArray(totals) ? totals : ((totals as { rows?: unknown[] }).rows ?? []);
  console.log("✓ counters rebuilt:", JSON.stringify(rows[0] ?? {}));

  await closeDb();
}

main().catch((error) => {
  console.error("✗ recount failed:", error);
  process.exit(1);
});
