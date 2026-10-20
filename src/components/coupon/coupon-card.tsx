import { Clock, Flame, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MerchantLogo } from "@/components/merchant/merchant-logo";
import type { CouponCard as CouponCardData } from "@/db/queries";
import { discountDisplay, expiryLabel, isEndingSoon } from "@/lib/coupon";
import { cn, formatCompact, safeHostname } from "@/lib/utils";

import { CouponActions } from "./coupon-actions";
import { SaveButton } from "./save-button";

/**
 * The core product surface. Everything a user needs to decide is visible
 * without opening the coupon: who it's from, what it's worth, whether it needs
 * a code, whether it can be trusted, and when it stops working.
 */
export function CouponCard({
  coupon,
  now = new Date(),
}: {
  coupon: CouponCardData;
  /** Injected so every card on a page shares one clock (and renders identically). */
  now?: Date;
}) {
  const { merchant, status } = coupon;
  const discount = discountDisplay(coupon, coupon.title);
  const endingSoon = isEndingSoon(coupon.expiresAt, now);
  const host = safeHostname(coupon.destinationUrl);
  const isDimmed = status === "expired" || status === "disabled";
  const isScheduled = status === "scheduled";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-4 shadow-card",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-card-hover",
        "focus-within:border-brand-300",
        coupon.isExclusive && status === "active" && "border-brand-200",
        isDimmed && "opacity-75 saturate-50",
      )}
    >
      {/* Featured marker — a deliberate accent, not decoration. */}
      {coupon.isFeatured && status === "active" ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-500 via-brand-400 to-save-400"
        />
      ) : null}

      <header className="flex items-start gap-3">
        <Link
          href={`/stores/${merchant.slug}`}
          className="relative z-10 shrink-0 rounded-xl transition-transform duration-150 hover:scale-105"
          aria-label={`View all ${merchant.name} deals`}
        >
          <MerchantLogo
            name={merchant.name}
            brandColor={merchant.brandColor}
            logoUrl={merchant.logoUrl}
            size="md"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/stores/${merchant.slug}`}
            className="relative z-10 block truncate text-sm font-semibold text-ink-900 transition-colors hover:text-brand-700"
          >
            {merchant.name}
          </Link>
          <p className="truncate text-xs text-ink-500">{host ?? merchant.websiteUrl}</p>
        </div>

        <SaveButton
          coupon={{
            slug: coupon.slug,
            title: coupon.title,
            code: coupon.code,
            merchantName: merchant.name,
            merchantSlug: merchant.slug,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            currency: coupon.currency,
            expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
          }}
          className="relative z-10 -mr-1.5 -mt-1"
        />
      </header>

      {/* ── value ─────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <p className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-[1.75rem] leading-none font-extrabold tracking-tight",
              status === "active" ? "text-save-600" : "text-ink-400",
            )}
          >
            {discount.value}
          </span>
          {discount.unit ? (
            <span
              className={cn(
                "text-sm font-semibold",
                status === "active" ? "text-save-700" : "text-ink-400",
              )}
            >
              {discount.unit}
            </span>
          ) : null}
        </p>

        <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {isScheduled ? (
            <Badge tone="brand">
              <Zap className="h-3 w-3" aria-hidden />
              Starts soon
            </Badge>
          ) : endingSoon && status === "active" ? (
            <Badge tone="alert">
              <Flame className="h-3 w-3" aria-hidden />
              Ending soon
            </Badge>
          ) : null}
          {coupon.isExclusive ? (
            <Badge tone="brand">
              <Sparkles className="h-3 w-3" aria-hidden />
              Exclusive
            </Badge>
          ) : null}
          {coupon.isVerified && status === "active" ? (
            <Badge tone="save">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Verified
            </Badge>
          ) : null}
        </span>
      </div>

      {/* ── what it is ────────────────────────────────────────────────── */}
      <h3 className="mt-2.5 text-[0.9375rem] leading-snug font-semibold text-ink-900">
        <Link href={`/coupon/${coupon.slug}`} className="hover:text-brand-700">
          {/* Pseudo-element stretches the click target to the whole card without
              nesting interactive elements inside each other. */}
          <span className="absolute inset-0 z-0" aria-hidden />
          {coupon.title}
        </Link>
      </h3>

      {coupon.description ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
          {coupon.description}
        </p>
      ) : null}

      {/* ── act ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 mt-4 pt-0">
        <CouponActions
          couponId={coupon.id}
          slug={coupon.slug}
          code={coupon.code}
          status={status}
          storeName={merchant.name}
        />
      </div>

      {/* ── meta ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
        <span className="flex min-w-0 items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className={cn("truncate", endingSoon && status === "active" && "font-semibold text-alert-700")}>
            {expiryLabel(coupon.expiresAt, now)}
          </span>
        </span>
        <span className="shrink-0 tabular">
          {formatCompact(coupon.clickCount)} used
        </span>
      </footer>
    </article>
  );
}
