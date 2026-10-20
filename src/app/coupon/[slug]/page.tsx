import type { Metadata } from "next";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ViewBeacon } from "@/components/analytics/view-beacon";
import { CouponDetailActions } from "@/components/coupon/coupon-detail-actions";
import { CouponGrid } from "@/components/coupon/coupon-grid";
import { SaveButton } from "@/components/coupon/save-button";
import { MerchantLogo } from "@/components/merchant/merchant-logo";
import { Badge } from "@/components/ui/badge";
import { getCouponBySlug, getRelatedCoupons } from "@/db/queries";
import { discountPhrase, expiryLabel } from "@/lib/coupon";
import { absoluteUrl } from "@/lib/env";
import { breadcrumbJsonLd, jsonLd, offerJsonLd } from "@/lib/jsonld";
import { cn, formatCompact, formatDate, safeHostname, toIsoDate, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) return { title: "Offer not found" };

  const coupon = await getCouponBySlug(slug);
  if (!coupon) return { title: "Offer not found", robots: { index: false, follow: true } };

  const title = `${coupon.merchant.name}: ${coupon.title}`;
  const description = truncate(
    `${discountPhrase(coupon)} at ${coupon.merchant.name}. ${
      coupon.code ? `Use code ${coupon.code}. ` : "No code needed. "
    }${expiryLabel(coupon.expiresAt)}.`,
    158,
  );

  return {
    title: truncate(title, 70),
    description,
    alternates: { canonical: absoluteUrl(`/coupon/${coupon.slug}`) },
    // Expired offers must drop out of the index rather than linger as thin,
    // permanently-stale pages.
    robots:
      coupon.status === "active"
        ? { index: true, follow: true }
        : { index: false, follow: true },
    openGraph: {
      title: truncate(title, 70),
      description,
      url: absoluteUrl(`/coupon/${coupon.slug}`),
      type: "article",
    },
  };
}

export default async function CouponPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const [{ state }] = await Promise.all([searchParams]);

  const coupon = await getCouponBySlug(slug);
  if (!coupon) notFound();

  const now = new Date();
  const related = await getRelatedCoupons(
    {
      id: coupon.id,
      merchantId: coupon.merchant.id,
      categoryIds: coupon.categories.map((category) => category.id),
    },
    6,
  );

  const host = safeHostname(coupon.destinationUrl);
  const primaryCategory = coupon.categories[0];
  const usable = coupon.status === "active";

  const facts = [
    {
      icon: Clock,
      label: "Expires",
      value: coupon.expiresAt ? formatDate(coupon.expiresAt) : "No end date",
      note: expiryLabel(coupon.expiresAt, now),
    },
    {
      icon: ShieldCheck,
      label: "Verified",
      value: coupon.isVerified ? "Yes" : "Not verified",
      note: coupon.verifiedAt ? `Checked ${formatDate(coupon.verifiedAt)}` : "Added from the merchant",
    },
    {
      icon: TrendingUp,
      label: "Used",
      value: `${formatCompact(coupon.clickCount)} times`,
      note: `${formatCompact(coupon.copyCount)} codes copied`,
    },
    {
      icon: CalendarClock,
      label: "Added",
      value: formatDate(coupon.createdAt),
      note: coupon.startsAt && coupon.startsAt > now ? "Starts later" : "Live now",
    },
  ];

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            breadcrumbJsonLd([
              { name: "Home", url: absoluteUrl("/") },
              ...(primaryCategory
                ? [
                    {
                      name: primaryCategory.name,
                      url: absoluteUrl(`/categories/${primaryCategory.slug}`),
                    },
                  ]
                : []),
              { name: coupon.merchant.name, url: absoluteUrl(`/stores/${coupon.merchant.slug}`) },
              { name: coupon.title, url: absoluteUrl(`/coupon/${coupon.slug}`) },
            ]),
            offerJsonLd({
              name: coupon.title,
              description: coupon.description || coupon.title,
              url: absoluteUrl(`/coupon/${coupon.slug}`),
              merchantName: coupon.merchant.name,
              code: coupon.code,
              expiresAt: coupon.expiresAt ? toIsoDate(coupon.expiresAt) : null,
            }),
          ]),
        }}
      />

      <ViewBeacon couponId={coupon.id} />

      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-ink-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          {primaryCategory ? (
            <>
              <li>
                <Link
                  href={`/categories/${primaryCategory.slug}`}
                  className="hover:text-brand-700"
                >
                  {primaryCategory.name}
                </Link>
              </li>
              <li aria-hidden>/</li>
            </>
          ) : null}
          <li>
            <Link href={`/stores/${coupon.merchant.slug}`} className="hover:text-brand-700">
              {coupon.merchant.name}
            </Link>
          </li>
        </ol>
      </nav>

      {/* ── state notice (set by /go when a click was refused) ───────── */}
      {state === "expired" || state === "scheduled" || state === "disabled" || state === "invalid" ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-alert-200 bg-alert-50 p-3.5"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alert-600" aria-hidden />
          <p className="text-sm leading-relaxed text-alert-800">
            {state === "invalid"
              ? "We could not open this offer because its destination link is not a valid web address."
              : state === "scheduled"
                ? "This offer has not started yet, so we did not send you to the store."
                : state === "disabled"
                  ? "This offer has been withdrawn by the merchant."
                  : "This offer expired just before you clicked it, so we stopped the redirect."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
        {/* ── main column ────────────────────────────────────────────── */}
        <div className="min-w-0">
          <article className="surface overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
              <Link href={`/stores/${coupon.merchant.slug}`} className="shrink-0">
                <MerchantLogo
                  name={coupon.merchant.name}
                  brandColor={coupon.merchant.brandColor}
                  logoUrl={coupon.merchant.logoUrl}
                  size="xl"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/stores/${coupon.merchant.slug}`}
                    className="text-sm font-bold text-ink-900 hover:text-brand-700"
                  >
                    {coupon.merchant.name}
                  </Link>
                  {coupon.isVerified ? (
                    <Badge tone="save">
                      <ShieldCheck className="h-3 w-3" aria-hidden />
                      Verified
                    </Badge>
                  ) : null}
                  {coupon.isExclusive ? (
                    <Badge tone="brand">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      Exclusive
                    </Badge>
                  ) : null}
                  {!usable ? <Badge tone="danger">Not available</Badge> : null}
                </div>

                <h1
                  className={cn(
                    "mt-2 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl",
                    !usable && "text-ink-500",
                  )}
                >
                  {coupon.title}
                </h1>

                {coupon.description ? (
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
                    {coupon.description}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {coupon.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      <Tag className="h-3 w-3" aria-hidden />
                      {category.name}
                    </Link>
                  ))}
                  {host ? (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      {host}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ── how to use ─────────────────────────────────────────── */}
            <div className="border-t border-ink-100 bg-ink-50/50 p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink-900">How to use it</h2>
              <ol className="mt-3 space-y-2.5">
                {(coupon.code
                  ? [
                      `Copy the code ${coupon.code}.`,
                      `Follow the link to ${coupon.merchant.name}.`,
                      "Paste the code in the promo or discount box at checkout.",
                      "Check the total updates before you pay.",
                    ]
                  : [
                      `Follow the link to ${coupon.merchant.name}.`,
                      "The discount is applied automatically — no code needed.",
                      "Check the total updates before you pay.",
                    ]
                ).map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[0.6875rem] font-bold text-ink-700 ring-1 ring-ink-200">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              {coupon.terms ? (
                <div className="mt-4 rounded-xl border border-ink-200 bg-white p-3.5">
                  <h3 className="text-xs font-bold tracking-wide text-ink-700 uppercase">
                    Terms &amp; restrictions
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{coupon.terms}</p>
                </div>
              ) : null}
            </div>
          </article>

          {/* ── related ──────────────────────────────────────────────── */}
          {related.length > 0 ? (
            <section className="mt-10" aria-labelledby="related-heading">
              <h2
                id="related-heading"
                className="mb-4 text-lg font-extrabold tracking-tight text-ink-900"
              >
                More deals like this
              </h2>
              <CouponGrid coupons={related} now={now} columns={2} />
            </section>
          ) : null}
        </div>

        {/* ── action rail ────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CouponDetailActions
            couponId={coupon.id}
            slug={coupon.slug}
            code={coupon.code}
            status={coupon.status}
            storeName={coupon.merchant.name}
          />

          <div className="surface mt-4 rounded-2xl p-4">
            <h2 className="text-xs font-bold tracking-wide text-ink-500 uppercase">
              Deal details
            </h2>
            <dl className="mt-3 space-y-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex gap-2.5">
                  <fact.icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-[0.6875rem] font-semibold tracking-wide text-ink-400 uppercase">
                      {fact.label}
                    </dt>
                    <dd className="text-sm font-semibold text-ink-900">{fact.value}</dd>
                    <dd className="text-xs text-ink-500">{fact.note}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="mt-4 border-t border-ink-100 pt-3">
              <SaveButton
                coupon={{
                  slug: coupon.slug,
                  title: coupon.title,
                  code: coupon.code,
                  merchantName: coupon.merchant.name,
                  merchantSlug: coupon.merchant.slug,
                  discountType: coupon.discountType,
                  discountValue: coupon.discountValue,
                  currency: coupon.currency,
                  expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
                }}
                showLabel
                className="w-full justify-center border border-ink-200"
              />
            </div>
          </div>

          <Link
            href={`/stores/${coupon.merchant.slug}`}
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition-colors hover:border-brand-200"
          >
            <span className="flex items-center gap-2.5">
              <MerchantLogo
                name={coupon.merchant.name}
                brandColor={coupon.merchant.brandColor}
                logoUrl={coupon.merchant.logoUrl}
                size="sm"
              />
              <span className="text-sm font-semibold text-ink-900">
                All {coupon.merchant.name} deals
              </span>
            </span>
            <ExternalLink className="h-4 w-4 text-ink-400" aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
  );
}
