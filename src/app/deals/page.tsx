import type { Metadata } from "next";
import { SearchX, Store } from "lucide-react";
import Link from "next/link";

import { CouponGrid } from "@/components/coupon/coupon-grid";
import { DealFilterControls, DealFilterSidebar } from "@/components/filters/deal-filters";
import { SortTabs } from "@/components/filters/sort-tabs";
import { SearchBar } from "@/components/search/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { getDealFacets, getMerchantForQuery, searchDeals } from "@/db/queries";
import { buildDealsHref } from "@/lib/deal-url";
import { absoluteUrl } from "@/lib/env";
import { itemListJsonLd, jsonLd } from "@/lib/jsonld";
import { truncate } from "@/lib/utils";
import type { RawSearchParams } from "@/lib/validation";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<RawSearchParams> };

function titleFor(query: { q?: string; category?: string; merchant?: string }) {
  if (query.q) return `Deals matching “${query.q}”`;
  if (query.category) return "Category deals";
  if (query.merchant) return "Store deals";
  return "All deals";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  // Search result pages must not be indexed: they are infinite permutations of
  // the same catalogue and produce thin, duplicative pages.
  if (q) {
    return {
      title: `Search results for “${q}”`,
      description: `Live coupon codes and deals matching ${q}.`,
      robots: { index: false, follow: true },
      alternates: { canonical: absoluteUrl(`/deals?q=${encodeURIComponent(q)}`) },
    };
  }

  return {
    title: "All deals — browse every live coupon code",
    description:
      "Browse every live coupon code and deal. Filter by store, category, discount size and verification status.",
    alternates: { canonical: absoluteUrl("/deals") },
  };
}

export default async function DealsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [result, facets] = await Promise.all([searchDeals(params), getDealFacets()]);

  const { query, items, total, page, totalPages } = result;
  const now = new Date();

  // If the visitor typed an exact store name, offer the store page directly.
  const merchantMatch =
    query.q && !query.merchant && !query.category
      ? await getMerchantForQuery(query.q)
      : null;

  const description = query.q
    ? `${total} live offer${total === 1 ? "" : "s"} matching “${query.q}”.`
    : `${total} live offer${total === 1 ? "" : "s"}, checked against the clock on every request.`;

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-ink-500">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand-700">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-700">Deals</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {titleFor(query)}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
      </header>

      {/* Search is available here too — refining a query should not require
          scrolling back to the top or opening the header again. */}
      <div className="mt-6 max-w-2xl">
        <SearchBar variant="mobile" initialQuery={query.q ?? ""} />
      </div>

      {merchantMatch ? (
        <Link
          href={`/stores/${merchantMatch.slug}`}
          className="mt-5 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 transition-colors hover:bg-brand-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-xs">
            <Store className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink-900">
              Looking for the {merchantMatch.name} store?
            </span>
            <span className="block text-xs text-ink-600">
              See everything live at {merchantMatch.name} in one place.
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-brand-700">Open store →</span>
        </Link>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <SortTabs query={query} />
        <DealFilterControls query={query} facets={facets} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <DealFilterSidebar query={query} facets={facets} />

        <div id="results">
          {items.length > 0 ? (
            <>
              <p className="mb-4 text-xs font-medium tracking-wide text-ink-500 uppercase">
                Showing {(page - 1) * result.perPage + 1}–
                {Math.min(page * result.perPage, total)} of {total}
              </p>

              <CouponGrid
                coupons={items}
                now={now}
                emptyTitle="No deals match these filters"
                emptyDescription="Try removing a filter, or search for a different store."
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                buildHref={(nextPage) => buildDealsHref(query, { page: nextPage })}
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-5">
                <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-ink-900">
                    {query.q ? `No live deals match “${query.q}”` : "No deals match these filters"}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">
                    {query.status === "active"
                      ? "We only show offers that have not expired. Try a shorter search term, clear a filter, or browse the categories instead."
                      : "Nothing here matches. Try clearing a filter or browsing all deals."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/deals"
                      className="inline-flex h-9 items-center rounded-lg bg-ink-900 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
                    >
                      Browse all deals
                    </Link>
                    <Link
                      href="/categories"
                      className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                    >
                      Browse categories
                    </Link>
                    {query.q ? (
                      <Link
                        href="/stores"
                        className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                      >
                        Find the store
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
                query.q ? `Deals matching ${query.q}` : "Live coupon deals",
              ),
            ),
          }}
        />
      ) : null}
    </div>
  );
}
