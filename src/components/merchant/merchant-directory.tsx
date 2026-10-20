"use client";

import { Search, Store } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MerchantLogo } from "@/components/merchant/merchant-logo";
import { EmptyState } from "@/components/ui/empty-state";
import type { MerchantWithCount } from "@/db/queries";
import { pluralize } from "@/lib/utils";

/**
 * Store directory. The full list is server-rendered (good for SEO and for the
 * first paint) and the filter box narrows it instantly on the client — no extra
 * round trips while typing.
 */
export function MerchantDirectory({ merchants }: { merchants: MerchantWithCount[] }) {
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return merchants;
    return merchants.filter((merchant) =>
      merchant.name.toLowerCase().includes(needle),
    );
  }, [merchants, term]);

  const withOffers = filtered.filter((merchant) => merchant.couponCount > 0);

  return (
    <div>
      <div className="relative max-w-sm">
        <label htmlFor="store-filter" className="sr-only">
          Filter stores by name
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <input
          id="store-filter"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Filter stores…"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>

      <p aria-live="polite" className="mt-4 text-xs font-medium tracking-wide text-ink-500 uppercase">
        {withOffers.length} of {merchants.length} stores
      </p>

      {withOffers.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Store}
            title={`No store matches “${term}”`}
            description="Check the spelling, or browse the full list of stores we track."
            action={
              <button
                type="button"
                onClick={() => setTerm("")}
                className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                Clear filter
              </button>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withOffers.map((merchant) => (
            <li key={merchant.slug}>
              <Link
                href={`/stores/${merchant.slug}`}
                className="group flex h-full items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
              >
                <MerchantLogo
                  name={merchant.name}
                  brandColor={merchant.brandColor}
                  logoUrl={merchant.logoUrl}
                  size="lg"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-900 group-hover:text-brand-700">
                    {merchant.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-500">
                    {merchant.tagline || "Online store"}
                  </span>
                  <span className="mt-1.5 inline-block rounded-full bg-save-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-save-700">
                    {pluralize(merchant.couponCount, "live offer")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
