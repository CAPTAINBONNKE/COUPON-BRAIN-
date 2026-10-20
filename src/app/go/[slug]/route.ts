import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { couponEvents, coupons } from "@/db/schema";
import { getCouponDestination } from "@/db/queries";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitKey, getVisitorHash } from "@/lib/visitor";

export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

/**
 * Outbound click tracking + safe redirect.
 *
 * Everything that matters is decided here, on the server, not in the browser:
 *  • the coupon's status is recomputed from its dates against the DB clock, so
 *    an offer that expired a minute ago cannot be clicked through
 *  • the destination URL is re-validated, so a stored value can never turn this
 *    into an open redirect or a javascript:/data: URL
 *  • the click is recorded before redirecting, which is the only place a click
 *    can be measured accurately (clients can be blocked or navigated away)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!SLUG_PATTERN.test(slug)) {
    return redirectTo("/deals");
  }

  const limit = checkRateLimit(await getRateLimitKey("go"), 120, 60_000);
  if (!limit.ok) {
    // Still let the user through — rate limiting must not break the product.
    logger.warn("go rate limit exceeded", { slug });
  }

  let destination: Awaited<ReturnType<typeof getCouponDestination>> = null;

  try {
    destination = await getCouponDestination(slug);
  } catch (error) {
    logger.error("go lookup failed", { error, slug });
    return redirectTo(`/coupon/${slug}`);
  }

  if (!destination) {
    return redirectTo("/deals");
  }

  if (destination.status !== "active") {
    // Send them to the detail page, which explains why it cannot be used and
    // offers similar live deals instead.
    return redirectTo(`/coupon/${slug}?state=${destination.status}`);
  }

  const target = safeExternalUrl(destination.url);
  if (!target) {
    logger.error("refusing unsafe destination url", {
      slug,
      couponId: destination.id,
    });
    return redirectTo(`/coupon/${slug}?state=invalid`);
  }

  // Record the click best-effort; never block the redirect on analytics.
  try {
    const visitorId = await getVisitorHash();
    if (visitorId) {
      const db = await getDb();
      await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(couponEvents)
          .values({
            type: "click",
            couponId: destination.id,
            merchantId: destination.merchantId,
            visitorId,
          })
          .onConflictDoNothing()
          .returning({ id: couponEvents.id });

        if (inserted.length > 0) {
          await tx
            .update(coupons)
            .set({ clickCount: sql`${coupons.clickCount} + 1`, updatedAt: sql`now()` })
            .where(eq(coupons.id, destination.id));
        }
      });
    }
  } catch (error) {
    logger.error("click tracking failed", { error, slug });
  }

  const response = NextResponse.redirect(target, 307);
  // Never leak our URLs or the visitor's session to the destination.
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

/**
 * Internal redirect using a relative Location header.
 *
 * Deliberately relative: it never depends on the incoming Host header, so it
 * behaves identically behind a proxy, a preview URL or a custom domain — and it
 * cannot be turned into an open redirect by a spoofed Host.
 */
function redirectTo(path: string): Response {
  return new Response(null, {
    status: 307,
    headers: { Location: path, "Cache-Control": "no-store, max-age=0" },
  });
}

/** Only plain http(s) destinations are ever followed. */
function safeExternalUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}
