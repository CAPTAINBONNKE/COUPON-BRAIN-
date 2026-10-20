/**
 * Coupon presentation + status logic.
 *
 * This module is imported by client components, so it must stay free of any
 * server-only dependency (no drizzle, no database). The matching SQL lives in
 * src/db/coupon-status.ts.
 *
 * COUPON VALIDITY is DERIVED, never stored: the database keeps only the facts
 * (is_disabled, starts_at, expires_at) and the status is computed from them
 * against the server clock. It can therefore never drift out of sync and never
 * depends on the visitor's device time.
 */

export const COUPON_STATUSES = ["active", "scheduled", "expired", "disabled"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export type StatusFacts = {
  isDisabled: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};

/** TypeScript mirror of the SQL CASE in src/db/coupon-status.ts. */
export function deriveStatus(facts: StatusFacts, now: Date = new Date()): CouponStatus {
  if (facts.isDisabled) return "disabled";
  if (facts.startsAt && facts.startsAt.getTime() > now.getTime()) return "scheduled";
  if (facts.expiresAt && facts.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

/* ── presentation helpers ─────────────────────────────────────────────────── */

export type DiscountShape = {
  discountType: string;
  discountValue: number | null;
  currency: string;
};

export type DiscountDisplay = { value: string; unit: string | null };

/**
 * The big thing a user scans for, split into a headline number and a unit so
 * the card can set a clear hierarchy ("40%" huge, "off" small).
 *
 * Different deal types get different presentations — a percentage, a fixed
 * amount, free shipping and a bundle are not the same shape of offer and should
 * not look identical.
 */
export function discountDisplay(coupon: DiscountShape, title = ""): DiscountDisplay {
  const value = coupon.discountValue;

  switch (coupon.discountType) {
    case "percent":
      return value == null
        ? { value: "Save", unit: null }
        : { value: `${formatAmount(value)}%`, unit: "off" };
    case "fixed":
      return value == null
        ? { value: "Save", unit: null }
        : { value: formatMoneyish(value, coupon.currency), unit: "off" };
    case "shipping":
      return { value: "Free", unit: "shipping" };
    case "bogo":
      return { value: "Buy 1", unit: "get 1 free" };
    default:
      // "other" covers free gifts, trials and bundles — infer the most useful
      // headline from the title rather than printing a meaningless number.
      return { value: /\bfree\b/i.test(title) ? "Free" : "Save", unit: null };
  }
}

/** Longer phrasing for headings, meta descriptions and structured data. */
export function discountPhrase(coupon: DiscountShape): string {
  const value = coupon.discountValue;

  switch (coupon.discountType) {
    case "percent":
      return value == null ? "Special offer" : `${formatAmount(value)}% off`;
    case "fixed":
      return value == null
        ? "Special offer"
        : `${formatMoneyish(value, coupon.currency)} off`;
    case "shipping":
      return "Free shipping";
    case "bogo":
      return "Buy one, get one";
    default:
      return value == null ? "Special offer" : `${formatAmount(value)} off`;
  }
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function formatMoneyish(value: number, currency: string): string {
  const formatted = formatAmount(value);
  const symbol = currencySymbols[currency.toUpperCase()];
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`;
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  KES: "KSh ",
  CAD: "C$",
  AUD: "A$",
  INR: "₹",
  JPY: "¥",
};

export function isEndingSoon(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  const diff = expiresAt.getTime() - now.getTime();
  return diff > 0 && diff <= 72 * 60 * 60 * 1000;
}

/** Human-readable expiry. Deterministic for a given (date, now) pair. */
export function expiryLabel(expiresAt: Date | null, now: Date = new Date()): string {
  if (!expiresAt) return "Ongoing offer";

  const diff = expiresAt.getTime() - now.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (diff <= 0) return "Expired";
  if (hours < 1) return "Ends in under an hour";
  if (hours < 24) return `Ends in ${hours} hour${hours === 1 ? "" : "s"}`;
  if (days === 1) return "Ends tomorrow";
  if (days <= 13) return `Ends in ${days} days`;

  const formatted = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(expiresAt);
  return `Ends ${formatted}`;
}
