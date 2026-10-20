"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { DealFacets } from "@/db/queries";
import { activeFilterCount, buildDealsHref, type DealQueryUpdates } from "@/lib/deal-url";
import type { DealQuery } from "@/lib/validation";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Filter UI for the browse page.
 *
 * Every option is a real link, so filters work without JavaScript and the
 * resulting URLs are shareable and crawlable. On mobile the same panel is
 * presented as a bottom sheet, which is far easier to use one-handed than a
 * sidebar squeezed into a phone.
 *
 * All counts come from `getDealFacets()` — no filter here is decorative.
 */

export type DealFiltersProps = {
  query: DealQuery;
  facets: DealFacets;
  basePath?: string;
};

function makeHref(query: DealQuery, basePath = "/deals") {
  return (updates: DealQueryUpdates) => buildDealsHref(query, updates, basePath);
}

/** Desktop: always-visible sticky sidebar. */
export function DealFilterSidebar({ query, facets, basePath }: DealFiltersProps) {
  return (
    <aside aria-label="Filters" className="hidden lg:block">
      <div className="surface sticky top-24 rounded-2xl p-4">
        <FilterPanel query={query} facets={facets} href={makeHref(query, basePath)} />
      </div>
    </aside>
  );
}

/** Mobile: a trigger button that opens the same panel as a bottom sheet. */
export function DealFilterControls({ query, facets, basePath }: DealFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = activeFilterCount(query);

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors lg:hidden",
          activeCount > 0
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
        )}
        aria-expanded={sheetOpen}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filters
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[0.6875rem] font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {sheetOpen ? (
        <FilterSheet onClose={() => setSheetOpen(false)}>
          <FilterPanel
            query={query}
            facets={facets}
            href={makeHref(query, basePath)}
            onNavigate={() => setSheetOpen(false)}
          />
        </FilterSheet>
      ) : null}
    </>
  );
}

function FilterSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-ink-950/40 backdrop-blur-sm"
      />
      <div
        className="animate-slide-up absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-pop"
      >
        <div className="sticky top-0 -mt-4 -mx-4 mb-2 flex items-center justify-between border-b border-ink-100 bg-white px-4 pt-4 pb-3">
          <h2 className="text-base font-bold text-ink-900">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
        <Link
          href="#results"
          onClick={onClose}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 text-sm font-semibold text-white"
        >
          Apply filters
        </Link>
      </div>
    </div>
  );
}

function FilterPanel({
  query,
  facets,
  href,
  onNavigate,
}: {
  query: DealQuery;
  facets: DealFacets;
  href: (updates: DealQueryUpdates) => string;
  onNavigate?: () => void;
}) {
  const activeCount = activeFilterCount(query);
  const navigate = onNavigate ?? (() => undefined);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-900">Refine</h2>
        {activeCount > 0 ? (
          <Link
            href={href({
              category: undefined,
              merchant: undefined,
              type: undefined,
              verified: false,
              minDiscount: undefined,
              status: "active",
            })}
            onClick={onNavigate}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      {/* ── type ─────────────────────────────────────────────────────── */}
      <FilterGroup label="How it works">
        <PillLink
          active={!query.type}
          href={href({ type: undefined })}
          onNavigate={navigate}
        >
          Everything
        </PillLink>
        <PillLink
          active={query.type === "code"}
          href={href({ type: query.type === "code" ? undefined : "code" })}
          onNavigate={navigate}
          count={facets.codeCount}
        >
          Codes
        </PillLink>
        <PillLink
          active={query.type === "deal"}
          href={href({ type: query.type === "deal" ? undefined : "deal" })}
          onNavigate={navigate}
          count={facets.dealCount}
        >
          Automatic
        </PillLink>
      </FilterGroup>

      {/* ── verified ─────────────────────────────────────────────────── */}
      <FilterGroup label="Trust">
        <PillLink
          active={query.verified === true}
          href={href({ verified: query.verified ? false : true })}
          onNavigate={navigate}
          count={facets.verifiedCount}
          tone="save"
        >
          Verified only
        </PillLink>
      </FilterGroup>

      {/* ── minimum discount ─────────────────────────────────────────── */}
      <FilterGroup label="Minimum discount">
        <div className="flex flex-wrap gap-2">
          {[0, 10, 25, 40, 50, 70].map((value) => (
            <PillLink
              key={value}
              active={(query.minDiscount ?? 0) === value}
              href={href({ minDiscount: query.minDiscount === value ? undefined : value || undefined })}
              onNavigate={navigate}
            >
              {value === 0 ? "Any" : `${value}%+`}
            </PillLink>
          ))}
        </div>
      </FilterGroup>

      {/* ── category ─────────────────────────────────────────────────── */}
      {facets.categories.length > 0 ? (
        <FilterGroup label="Category">
          <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
            <CheckLink
              active={!query.category}
              href={href({ category: undefined })}
              onNavigate={navigate}
            >
              All categories
            </CheckLink>
            {facets.categories.map((category) => (
              <CheckLink
                key={category.slug}
                active={query.category === category.slug}
                href={href({ category: query.category === category.slug ? undefined : category.slug })}
                onNavigate={navigate}
                count={category.count}
              >
                {category.name}
              </CheckLink>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {/* ── store ────────────────────────────────────────────────────── */}
      {facets.merchants.length > 0 ? (
        <FilterGroup label="Store">
          <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
            <CheckLink
              active={!query.merchant}
              href={href({ merchant: undefined })}
              onNavigate={navigate}
            >
              All stores
            </CheckLink>
            {facets.merchants.map((merchant) => (
              <CheckLink
                key={merchant.slug}
                active={query.merchant === merchant.slug}
                href={href({ merchant: query.merchant === merchant.slug ? undefined : merchant.slug })}
                onNavigate={navigate}
                count={merchant.count}
              >
                {merchant.name}
              </CheckLink>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {/* ── status ───────────────────────────────────────────────────── */}
      <FilterGroup label="Availability">
        <CheckLink
          active={query.status === "active"}
          href={href({ status: "active" })}
          onNavigate={navigate}
        >
          Live now
        </CheckLink>
        <CheckLink
          active={query.status === "expired"}
          href={href({ status: "expired" })}
          onNavigate={navigate}
        >
          Expired
        </CheckLink>
        <CheckLink
          active={query.status === "all"}
          href={href({ status: "all" })}
          onNavigate={navigate}
        >
          Every offer
        </CheckLink>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  label,
  children,
  id,
}: {
  label: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div>
      <h3 id={id} className="mb-2 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
        {label}
      </h3>
      {children}
    </div>
  );
}

function PillLink({
  active,
  href,
  children,
  count,
  onNavigate,
  tone = "brand",
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  count?: number;
  onNavigate: () => void;
  tone?: "brand" | "save";
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
        active
          ? tone === "save"
            ? "border-save-300 bg-save-50 text-save-800"
            : "border-brand-300 bg-brand-50 text-brand-800"
          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900",
      )}
    >
      {children}
      {count !== undefined ? (
        <span className="text-[0.6875rem] font-medium text-ink-400 tabular">
          {formatNumber(count)}
        </span>
      ) : null}
    </Link>
  );
}

function CheckLink({
  active,
  href,
  children,
  count,
  onNavigate = () => undefined,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  count?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
        active ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white",
        )}
        aria-hidden
      >
        {active ? <Check className="h-3 w-3" strokeWidth={3.5} /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined ? (
        <span className="shrink-0 text-xs text-ink-400 tabular">{formatNumber(count)}</span>
      ) : null}
    </Link>
  );
}
