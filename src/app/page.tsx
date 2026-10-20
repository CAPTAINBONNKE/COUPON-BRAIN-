import type { Metadata } from "next";
import { Flame, TrendingUp } from "lucide-react";

import { CategoryTile } from "@/components/category/category-tile";
import { CouponGrid } from "@/components/coupon/coupon-grid";
import { CouponRow } from "@/components/coupon/coupon-row";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { MerchantTile } from "@/components/merchant/merchant-tile";
import { ScrollRail, Section } from "@/components/ui/section";
import { getCategoriesWithCounts, getFeaturedMerchants, getHomeSections } from "@/db/queries";
import { absoluteUrl, env } from "@/lib/env";
import { itemListJsonLd, jsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";

/**
 * The homepage reads from the database on every request so expiry, counts and
 * trending order are always current.
 *
 * On a hosted Postgres (Supabase) you can turn this into ISR by replacing
 * `force-dynamic` with `export const revalidate = 300`. It stays dynamic here
 * because the local embedded database cannot be opened safely by Next.js build
 * workers.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "COUPON BRAIN — Verified coupon codes and deals that actually work",
  description:
    "Search working promo codes and deals from 38+ stores. Expiry checked server-side, verified offers flagged, copy a code in one tap.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: "COUPON BRAIN — Verified coupon codes and deals that actually work",
    description:
      "Search working promo codes and deals from 38+ stores. Expiry checked server-side, verified offers flagged, copy a code in one tap.",
    url: absoluteUrl("/"),
    type: "website",
  },
};

export default async function HomePage() {
  const [sections, stores, categories] = await Promise.all([
    getHomeSections(),
    getFeaturedMerchants(12),
    getCategoriesWithCounts(),
  ]);

  // One clock for the whole page so every card agrees on "now".
  const now = new Date();
  const { stats } = sections;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([websiteJsonLd(), organizationJsonLd()]),
        }}
      />

      <Hero stats={stats} popularStores={stores} />

      <div className="space-y-16 py-14 sm:space-y-20 sm:py-16">
        {/* ── featured ───────────────────────────────────────────────── */}
        {sections.featured.length > 0 ? (
          <Section
            id="featured"
            eyebrow="Hand-picked"
            title="Featured deals right now"
            subtitle="The offers we would use first — high value, verified, and not about to disappear."
            href="/deals?sort=popular"
            linkLabel="See all deals"
          >
            <CouponGrid coupons={sections.featured} now={now} />
          </Section>
        ) : null}

        {/* ── stores ─────────────────────────────────────────────────── */}
        {stores.length > 0 ? (
          <Section
            id="stores"
            eyebrow="Where people save"
            title="Popular stores"
            subtitle="Jump straight to a brand and see everything that is live for it today."
            href="/stores"
          >
            <ScrollRail>
              {stores.map((store) => (
                <MerchantTile
                  key={store.slug}
                  merchant={store}
                  className="w-64 shrink-0 sm:w-auto"
                />
              ))}
            </ScrollRail>
          </Section>
        ) : null}

        {/* ── categories ─────────────────────────────────────────────── */}
        {categories.length > 0 ? (
          <Section
            id="categories"
            eyebrow="Browse"
            title="Shop by category"
            subtitle={`${categories.length} categories, each showing how many offers are live at this moment.`}
            href="/categories"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <CategoryTile key={category.slug} category={category} />
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── high value ─────────────────────────────────────────────── */}
        {sections.highValue.length > 0 ? (
          <Section
            id="high-value"
            eyebrow="Biggest savings"
            title="Deals worth 40% off or more"
            subtitle="Ordered by the size of the discount, not by who paid us."
            href="/deals?sort=discount"
            linkLabel="Sort by discount"
          >
            <CouponGrid coupons={sections.highValue} now={now} />
          </Section>
        ) : null}

        {/* ── trending + ending soon ─────────────────────────────────── */}
        {sections.trending.length > 0 || sections.endingSoon.length > 0 ? (
          <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-8">
            {sections.trending.length > 0 ? (
              <section aria-labelledby="trending-heading">
                <header className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.14em] text-brand-600 uppercase">
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                      Trending
                    </p>
                    <h2
                      id="trending-heading"
                      className="text-xl font-extrabold tracking-tight text-ink-900"
                    >
                      Most used this week
                    </h2>
                  </div>
                </header>
                <ul className="space-y-2.5">
                  {sections.trending.map((coupon, index) => (
                    <li key={coupon.id}>
                      <CouponRow coupon={coupon} now={now} rank={index + 1} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {sections.endingSoon.length > 0 ? (
              <section aria-labelledby="ending-heading">
                <header className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.14em] text-alert-600 uppercase">
                      <Flame className="h-3.5 w-3.5" aria-hidden />
                      Last chance
                    </p>
                    <h2
                      id="ending-heading"
                      className="text-xl font-extrabold tracking-tight text-ink-900"
                    >
                      Ending in the next 3 days
                    </h2>
                  </div>
                </header>
                <ul className="space-y-2.5">
                  {sections.endingSoon.map((coupon) => (
                    <li key={coupon.id}>
                      <CouponRow coupon={coupon} now={now} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {/* ── recently added ─────────────────────────────────────────── */}
        {sections.recent.length > 0 ? (
          <Section
            id="recent"
            eyebrow="Fresh"
            title="Just added"
            subtitle="Newly published offers, newest first."
            href="/deals?sort=newest"
            linkLabel="Newest deals"
          >
            <CouponGrid coupons={sections.recent} now={now} />
          </Section>
        ) : null}

        <TrustSection liveCoupons={stats.liveCoupons} />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            itemListJsonLd(
              sections.featured.map((coupon) => ({
                name: `${coupon.merchant.name}: ${coupon.title}`,
                url: absoluteUrl(`/coupon/${coupon.slug}`),
              })),
              "Featured coupon deals",
            ),
          ),
        }}
      />

      <span className="sr-only">{env.siteName} — find, understand and use coupon codes.</span>
    </>
  );
}
