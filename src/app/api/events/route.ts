import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { couponEvents, coupons } from "@/db/schema";
import { apiErrorResponse, logger } from "@/lib/logger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getVisitorHash, getRateLimitKey } from "@/lib/visitor";
import { eventPayloadSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Maps an event type to the denormalised counter it feeds on `coupons`. */
const COUNTER_COLUMN: Record<string, "viewCount" | "copyCount" | "clickCount"> = {
  view: "viewCount",
  copy: "copyCount",
  click: "clickCount",
};

/**
 * Records a coupon interaction.
 *
 * Two things happen together, in one transaction:
 *   1. the raw row is appended to `coupon_events` (source of truth)
 *   2. the matching counter on `coupons` is incremented (the cache)
 *
 * The events table has a unique index on
 * (coupon_id, visitor_id, type, hour_bucket), so a double-click or a retry
 * either inserts once or is dropped — the counter can never drift ahead of the
 * raw log. If the insert is deduplicated, the counter is left alone.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit(await getRateLimitKey("events"), 90, 60_000);
  if (!limit.ok) {
    return apiErrorResponse("Too many requests.", 429, { route: "/api/events" }, rateLimitHeaders(limit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse("Malformed JSON body.", 400);
  }

  const parsed = eventPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse("Invalid event payload.", 422, undefined, parsed.error.flatten());
  }

  const visitorId = await getVisitorHash();
  if (!visitorId) {
    // No analytics cookie yet (first request). Not an error — just skip.
    return Response.json({ ok: true, skipped: true }, { status: 202 });
  }

  const { type, couponId, merchantId, categoryId, q } = parsed.data;

  try {
    const db = await getDb();

    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(couponEvents)
        .values({
          type,
          couponId: couponId ?? null,
          merchantId: merchantId ?? null,
          categoryId: categoryId ?? null,
          visitorId,
          payload: q ? { q } : null,
        })
        .onConflictDoNothing()
        .returning({ id: couponEvents.id });

      if (inserted.length === 0) return; // Deduplicated: do not double count.

      const counter = COUNTER_COLUMN[type];
      if (counter && couponId) {
        await tx
          .update(coupons)
          .set({ [counter]: sql`${coupons[counter]} + 1`, updatedAt: sql`now()` })
          .where(eq(coupons.id, couponId));
      }
    });

    return Response.json(
      { ok: true },
      { status: 202, headers: { "cache-control": "no-store", ...rateLimitHeaders(limit) } },
    );
  } catch (error) {
    // Analytics must never surface as a user-facing failure.
    logger.error("event write failed", { error, type, couponId });
    return Response.json({ ok: false }, { status: 202, headers: { "cache-control": "no-store" } });
  }
}
