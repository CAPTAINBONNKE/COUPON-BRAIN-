import type { Metadata } from "next";
import { ExternalLink, Globe, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryIcon } from "@/components/category/category-icon";
import { CouponGrid } from "@/components/coupon/coupon-grid";
import { SortTabs } from "@/components/filters/sort-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  getCategoriesForMerchant,
  getMerchantBySlug,
  getMerchantDeals,
  getMerchantsWithCounts,
} from "@/db/queries";
import { buildDealsHref } from "@/lib/deal-url";
import { absoluteUrl } from "@/lib/env";
import { breadcrumbJsonLd, itemListJsonLd, jsonLd } from "@/lib/jsonld";
import { MerchantLogo } from "@/components/merchant/merchant-logo";
import { pluralize, safeHostname, truncate } from "@/lib/utils";
import type { RawSearchParams } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) return { title: "Store not found" };

  const merchant = await getMerchantBySlug(slug);
  if (!merchant) return { title: "Store not found", robots: { index: false, follow: true } };

  const title = `${merchant.name} promo codes & deals`;
  const description = truncate(
    merchant.description ||
      `Live ${merchant.name} promo codes and deals, checked server-side.`,
    158,
  );

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/stores/${merchant.slug}`) },
    openGraph: {
      title: `${title} | COUPON BRAIN`,
      description,
      url: absoluteUrl(`/stores/${merchant.slug}`),
      type: "website",
    },
  };
}

export default async function MerchantPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const search = await searchParams;

  const merchant = await getMerchantBySlug(slug);
  if (!merchant) notFound();

  const [result, categories, similar] = await Promise.all([
    getMerchantDeals(slug, search),
    getCategoriesForMerchant(merchant.id),
    getMerchantsWithCounts(60),
  ]);

  const now = new Date();
  const { items, total, page, totalPages, query } = result;
  const host = safeHostname(merchant.websiteUrl);
  const verifiedCount = items.filter((coupon) => coupon.isVerified).length;

  const alsoTry = similar
    .filter(
      (entry) => entry.slug !== merchant.slug && entry.couponCount > 0,
    )
    .slice(0, 4);

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbJsonLd([
              { name: "Home", url: absoluteUrl("/") },
              { name: "Stores", url: absoluteUrl("/stores") },
              { name: merchant.name, url: absoluteUrl(`/stores/${merchant.slug}`) },
            ]),
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-ink-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/stores" className="hover:text-brand-700">
              Stores
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-ink-700">{merchant.name}</li>
        </ol>
      </nav>

      {/* ── merchant identity ────────────────────────────────────────── */}
      <header className="surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          <MerchantLogo
            name={merchant.name}
            brandColor={merchant.brandColor}
            logoUrl={merchant.logoUrl}
            size="xl"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              {merchant.name} promo codes
            </h1>
            {merchant.tagline ? (
              <p className="mt-1.5 text-sm font-medium text-brand-700">{merchant.tagline}</p>
            ) : null}
            {merchant.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">
                {merchant.description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={merchant.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow noopener sponsored"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {host ?? "Visit store"}
                <ExternalLink className="h-3 w-3" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              {merchant.country && merchant.country !== "Global" ? (
                <span className="inline-flex h-9 items-center rounded-lg bg-ink-50 px-3 text-sm font-medium text-ink-600">
                  {merchant.country}
                </span>
              ) : null}
            </div>
          </div>

          <dl className="grid shrink-0 grid-cols-2 gap-3 sm:w-56">
            <div className="rounded-xl bg-ink-50 p-3">
              <dt className="text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase">
                Live offers
              </dt>
              <dd className="mt-0.5 text-xl font-extrabold text-ink-900 tabular">{total}</dd>
            </div>
            <div className="rounded-xl bg-ink-50 p-3">
              <dt className="text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase">
                Verified
              </dt>
              <dd className="mt-0.5 text-xl font-extrabold text-ink-900 tabular">
                {verifiedCount}
              </dd>
            </div>
          </dl>
        </div>

        {categories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 bg-ink-50/50 px-5 py-3.5 sm:px-6">
            <span className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
              Shopped for
            </span>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                <CategoryIcon
                  icon={category.icon}
                  accent={category.accent}
                  size="sm"
                  className="h-5 w-5"
                />
                {category.name}
                <span className="text-ink-400 tabular">{category.couponCount}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      {/* ── offers ───────────────────────────────────────────────────── */}
      <div className="mt-7 flex items-center justify-between gap-3">
        <SortTabs query={query} basePath={`/stores/${merchant.slug}`} />
        <span className="hidden shrink-0 text-xs text-ink-500 sm:block">
          {total === 0 ? "No live offers" : `${total} live offer${total === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="mt-5">
        {items.length > 0 ? (
          <CouponGrid coupons={items} now={now} />
        ) : (
          <EmptyState
            icon={Tag}
            title={`${merchant.name} has no live offers right now`}
            description="We only list offers that have not expired. New codes are added regularly — check back, or browse similar stores below."
            action={
              <Link
                href="/deals?sort=newest"
                className="inline-flex h-9 items-center rounded-lg bg-ink-900 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
              >
                See the newest deals
              </Link>
            }
          />
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(nextPage) =>
          buildDealsHref(query, { page: nextPage }, `/stores/${merchant.slug}`)
        }
      />

      {alsoTry.length > 0 ? (
        <section className="mt-14" aria-labelledby="similar-stores">
          <h2
            id="similar-stores"
            className="mb-4 text-lg font-extrabold tracking-tight text-ink-900"
          >
            Similar stores
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {alsoTry.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/stores/${entry.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
                >
                  <MerchantLogo
                    name={entry.name}
                    brandColor={entry.brandColor}
                    logoUrl={entry.logoUrl}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900 group-hover:text-brand-700">
                      {entry.name}
                    </span>
                    <span className="block truncate text-xs text-ink-500">
                      {pluralize(entry.couponCount, "offer")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {items.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              itemListJsonLd(
                items.map((coupon) => ({
                  name: truncate(`${coupon.merchant.name}: ${coupon.title}`, 110),
                  url: absoluteUrl(`/coupon/${coupon.slug}`),
                })),
                `${merchant.name} deals`,
              ),
            ),
          }}
        />
      ) : null}
    </div>
  );
}
