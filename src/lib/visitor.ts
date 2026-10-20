import { createHash } from "node:crypto";

import { cookies, headers } from "next/headers";

import { env } from "./env";

import { VISITOR_COOKIE } from "./visitor-constants";

/**
 * Anonymous analytics identity.
 *
 * A random, opaque id is issued as an httpOnly cookie by middleware.ts. The
 * database only ever stores a salted SHA-256 of it, so even a full dump of the
 * coupon_events table cannot be joined back to a browser cookie.
 */

export function hashVisitorId(rawId: string): string {
  return createHash("sha256").update(`${env.visitorHashSalt}:${rawId}`).digest("hex").slice(0, 32);
}

/**
 * Server-side visitor id. Returns null when no cookie exists yet (the very
 * first request, before middleware runs) — callers should simply skip logging.
 */
export async function getVisitorId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(VISITOR_COOKIE)?.value;
  return raw && raw.length > 10 ? raw : null;
}

/** Hashed id used for analytics + rate limiting. */
export async function getVisitorHash(): Promise<string | null> {
  const raw = await getVisitorId();
  return raw ? hashVisitorId(raw) : null;
}

/** Best-effort client key for rate limiting: visitor hash, else hashed IP. */
export async function getRateLimitKey(prefix: string): Promise<string> {
  const visitor = await getVisitorHash();
  if (visitor) return `${prefix}:${visitor}`;

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";
  return `${prefix}:ip:${createHash("sha256").update(`${env.visitorHashSalt}:${ip}`).digest("hex").slice(0, 32)}`;
}
