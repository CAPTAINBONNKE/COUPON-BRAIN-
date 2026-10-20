/**
 * Environment access, validated once, with safe defaults.
 * Anything secret must stay on the server — this module is never imported by a
 * client component.
 */

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

function normaliseSiteUrl(value: string | undefined): string {
  if (!value) return "http://localhost:3000";
  try {
    const url = new URL(value);
    return url.origin.replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

export const env = {
  /** Absolute origin with no trailing slash, e.g. https://couponbrain.app */
  siteUrl: normaliseSiteUrl(rawSiteUrl),
  siteName: "COUPON BRAIN",
  databaseUrl: process.env.DATABASE_URL?.trim() ?? "",
  /**
   * Salt for hashing the anonymous analytics visitor id. A missing salt is a
   * misconfiguration rather than a crash: analytics still work, they just are
   * not reproducible across deploys.
   */
  visitorHashSalt: process.env.VISITOR_HASH_SALT?.trim() || "coupon-brain-dev-salt",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export function absoluteUrl(path = "/"): string {
  return `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
