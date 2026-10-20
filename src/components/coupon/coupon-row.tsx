import { Clock, ExternalLink, Flame } from "lucide-react";
import Link from "next/link";

import { MerchantLogo } from "@/components/merchant/merchant-logo";
import type { CouponCard as CouponCardData } from "@/db/queries";
import { discountDisplay, expiryLabel, isEndingSoon } from "@/lib/coupon";
import { cn, formatCompact } from "@/lib/utils";

import { CopyButton } from "./copy-button";

/**
 * Compact horizontal variant used in ranked lists (trending, ending soon).
 * Same information as the grid card, reflowed for scanning many offers fast.
 */
export function CouponRow({
  coupon,
  now,
  rank,
}: {
  coupon: CouponCardData;
  now: Date;
  rank?: number;
}) {
  const discount = discountDisplay(coupon, coupon.title);
  const endingSoon = isEndingSoon(coupon.expiresAt, now);
  const usable = coupon.status === "active";

  return (
    <article
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-xs",
        "transition-all duration-150 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-card",
        !usable && "opacity-70 saturate-50",
      )}
    >
      {rank !== undefined ? (
        <span className="hidden w-5 shrink-0 text-center text-sm font-bold text-ink-300 tabular sm:block">
          {rank}
        </span>
      ) : null}

      <MerchantLogo
        name={coupon.merchant.name}
        brandColor={coupon.merchant.brandColor}
        logoUrl={coupon.merchant.logoUrl}
        size="md"
        className="hidden sm:flex"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/stores/${coupon.merchant.slug}`}
            className="relative z-10 truncate text-xs font-semibold text-ink-500 transition-colors hover:text-brand-700"
          >
            {coupon.merchant.name}
          </Link>
          {endingSoon && usable ? (
            <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-bold text-alert-600 uppercase">
              <Flame className="h-3 w-3" aria-hidden />
              Soon
            </span>
          ) : null}
        </div>

        <h3 className="mt-0.5 truncate text-sm font-semibold text-ink-900">
          {/* Stretched link keeps the whole row clickable. */}
          <Link href={`/coupon/${coupon.slug}`} className="hover:text-brand-700">
            <span className="absolute inset-0 z-0" aria-hidden />
            {coupon.title}
          </Link>
        </h3>

        <p className="mt-1 flex items-center gap-2 text-xs text-ink-500">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          <span className={cn("truncate", endingSoon && usable && "font-semibold text-alert-700")}>
            {expiryLabel(coupon.expiresAt, now)}
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0 tabular">{formatCompact(coupon.clickCount)} used</span>
        </p>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "text-base font-extrabold tracking-tight",
              usable ? "text-save-600" : "text-ink-400",
            )}
          >
            {discount.value}
            {discount.unit ? (
              <span className="ml-1 text-xs font-semibold">{discount.unit}</span>
            ) : null}
          </span>

          {coupon.code && usable ? (
            <span className="hidden rounded-md border border-dashed border-ink-300 bg-ink-50 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-ink-800 sm:block">
              {coupon.code}
            </span>
          ) : null}
        </div>

        {usable ? (
          coupon.code ? (
            <CopyButton
              code={coupon.code}
              couponId={coupon.id}
              label={coupon.merchant.name}
              className="hidden sm:inline-flex"
            />
          ) : (
            <a
              href={`/go/${coupon.slug}`}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              aria-label={`Get this deal at ${coupon.merchant.name}`}
              className={cn(
                "hidden h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white transition-colors hover:bg-ink-800 sm:inline-flex",
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )
        ) : null}
      </div>
    </article>
  );
}
