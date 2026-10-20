import { getSuggestions } from "@/db/queries";
import { apiErrorResponse, logger } from "@/lib/logger";
import { getRateLimitKey } from "@/lib/visitor";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { suggestQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Autocomplete backing the search box: stores, categories and deals. */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const parsed = suggestQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { ok: true, merchants: [], categories: [], coupons: [] },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }

  const limit = checkRateLimit(await getRateLimitKey("suggest"), 120, 60_000);
  if (!limit.ok) {
    return apiErrorResponse("Too many requests. Slow down and try again.", 429, {
      route: "/api/suggest",
    });
  }

  try {
    const data = await getSuggestions(parsed.data.q, parsed.data.limit);

    return Response.json(
      { ok: true, ...data },
      {
        status: 200,
        headers: {
          // Short-lived shared cache: suggestions are cheap but not free.
          "cache-control": "public, max-age=30, stale-while-revalidate=120",
          ...rateLimitHeaders(limit),
        },
      },
    );
  } catch (error) {
    // Autocomplete is an enhancement — a failure must still be a valid, empty
    // response so the search box keeps working.
    logger.error("suggest query failed", { error, q: parsed.data.q });
    return Response.json(
      { ok: true, merchants: [], categories: [], coupons: [] },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }
}
