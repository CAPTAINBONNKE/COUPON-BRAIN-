import type { CouponCard } from "@/db/queries";
import type { CouponStatus } from "@/lib/coupon";

/**
 * Wire format for coupon cards returned by /api/coupons.
 *
 * Dates travel as ISO strings; `parseCouponCard()` turns them back into Date
 * objects so the exact same <CouponCard /> component can render saved deals as
 * renders everything else. One card component, one contract.
 */

export type SerializedMerchant = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  websiteUrl: string;
  tagline: string;
  country: string;
};

export type SerializedCategory = {
  id: number;
  name: string;
  slug: string;
  icon: string;
  accent: string;
  description: string;
};

export type SerializedCouponCard = {
  id: number;
  slug: string;
  title: string;
  description: string;
  terms: string | null;
  kind: string;
  code: string | null;
  discountType: string;
  discountValue: number | null;
  currency: string;
  destinationUrl: string;
  imageUrl: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  isFeatured: boolean;
  isExclusive: boolean;
  viewCount: number;
  copyCount: number;
  clickCount: number;
  createdAt: string;
  status: CouponStatus;
  merchant: SerializedMerchant;
  categories: SerializedCategory[];
};

const toIso = (value: Date | null): string | null =>
  value ? new Date(value).toISOString() : null;

export function serializeCouponCard(coupon: CouponCard): SerializedCouponCard {
  return {
    id: coupon.id,
    slug: coupon.slug,
    title: coupon.title,
    description: coupon.description,
    terms: coupon.terms,
    kind: coupon.kind,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    currency: coupon.currency,
    destinationUrl: coupon.destinationUrl,
    imageUrl: coupon.imageUrl,
    startsAt: toIso(coupon.startsAt),
    expiresAt: toIso(coupon.expiresAt),
    isVerified: coupon.isVerified,
    verifiedAt: toIso(coupon.verifiedAt),
    isFeatured: coupon.isFeatured,
    isExclusive: coupon.isExclusive,
    viewCount: coupon.viewCount,
    copyCount: coupon.copyCount,
    clickCount: coupon.clickCount,
    createdAt: new Date(coupon.createdAt).toISOString(),
    status: coupon.status,
    merchant: coupon.merchant,
    categories: coupon.categories,
  };
}

const toDate = (value: string | null): Date | null => (value ? new Date(value) : null);

/** Defensive parse: a stale localStorage entry must never crash the page. */
export function parseCouponCard(raw: SerializedCouponCard): CouponCard | null {
  try {
    return {
      ...raw,
      startsAt: toDate(raw.startsAt),
      expiresAt: toDate(raw.expiresAt),
      verifiedAt: toDate(raw.verifiedAt),
      createdAt: new Date(raw.createdAt),
    };
  } catch {
    return null;
  }
}
