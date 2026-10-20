import { getCouponsBySlugs } from "@/db/queries";
import { serializeCouponCard } from "@/lib/coupon-serialize";
import { apiErrorResponse, logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitKey } from "@/lib/visitor";

export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
const MAX_SLUGS = 60;

/**
 * Re-hydrates a list of saved deal slugs.
 *
 * The browser only stores slugs; every visit re-reads the real coupon from the
 * database so codes, expiry and status are never stale. Input is strictly
 * validated — arbitrary slug lists are cheap to reject.
 */
export async function GET(request: Request) {
  const limit = checkRateLimit(await getRateLimitKey("coupons"), 60, 60_000);
  if (!limit.ok) return apiErrorResponse("Too many requests.", 429);

  const url = new URL(request.url);
  const raw = url.searchParams.get("slugs") ?? "";

  const slugs = Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter((value) => SLUG_PATTERN.test(value)),
    ),
  ).slice(0, MAX_SLUGS);

  if (slugs.length === 0) {
    return Response.json({ ok: true, coupons: [] }, { headers: { "cache-control": "no-store" } });
  }

  try {
    const coupons = await getCouponsBySlugs(slugs);

    return Response.json(
      { ok: true, coupons: coupons.map(serializeCouponCard) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    logger.error("saved lookup failed", { error, count: slugs.length });
    return apiErrorResponse("Could not load saved deals.", 500);
  }
}
