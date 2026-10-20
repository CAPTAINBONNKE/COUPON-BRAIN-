"use client";

import { Loader2, Search, Tag, Ticket, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MerchantLogo } from "@/components/merchant/merchant-logo";
import { cn } from "@/lib/utils";

/**
 * Search with autocomplete across stores, categories and individual deals.
 *
 * Behaviour:
 *  • Debounced (250 ms) so typing does not hammer the API.
 *  • In-flight requests are aborted when a newer keystroke arrives.
 *  • Full keyboard support (↑ ↓ Enter Esc) with correct combobox semantics.
 *  • Fails soft: a broken suggestion API degrades to plain search submission,
 *    it never blocks the user from searching.
 */

type MerchantHit = {
  name: string;
  slug: string;
  couponCount: number;
  brandColor: string | null;
  logoUrl: string | null;
};
type CategoryHit = { name: string; slug: string; icon: string; accent: string; couponCount: number };
type CouponHit = { slug: string; title: string; merchantName: string };

type SuggestResponse = {
  merchants: MerchantHit[];
  categories: CategoryHit[];
  coupons: CouponHit[];
};

type Row =
  | { kind: "merchant"; key: string; href: string; label: string; meta: string; hit: MerchantHit }
  | { kind: "category"; key: string; href: string; label: string; meta: string; hit: CategoryHit }
  | { kind: "coupon"; key: string; href: string; label: string; meta: string }
  | { kind: "all"; key: string; href: string; label: string; meta: string };

const DEBOUNCE_MS = 250;
const MIN_CHARS = 1;

const PLACEHOLDERS: Record<"header" | "hero" | "mobile", string> = {
  // The header box is narrow; the full sentence is reserved for the hero.
  header: "Search stores or codes…",
  mobile: "Search deals…",
  hero: "Search stores, categories or codes…",
};

export function SearchBar({
  variant = "header",
  initialQuery = "",
  autoFocus = false,
  className,
  placeholder,
}: {
  variant?: "header" | "hero" | "mobile";
  initialQuery?: string;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();

  const [query, setQuery] = useState(initialQuery);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [failed, setFailed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();

  /* ── debounced suggestions ─────────────────────────────────────────────── */
  useEffect(() => {
    if (trimmed.length < MIN_CHARS) {
      setRows([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}&limit=5`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      })
        .then((response) => {
          if (!response.ok) throw new Error(`suggest failed: ${response.status}`);
          return response.json() as Promise<SuggestResponse>;
        })
        .then((data) => {
          setRows(buildRows(data, trimmed));
          setFailed(false);
          setActiveIndex(-1);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          // Suggestions are an enhancement — the search itself still works.
          setRows([]);
          setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trimmed]);

  /* ── close on outside click ────────────────────────────────────────────── */
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const submit = useCallback(
    (value: string) => {
      const term = value.trim();
      setOpen(false);
      inputRef.current?.blur();
      router.push(term ? `/deals?q=${encodeURIComponent(term)}` : "/deals");
    },
    [router],
  );

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      inputRef.current?.blur();
      router.push(href);
    },
    [router],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (rows.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        if (next < 0) return rows.length - 1;
        if (next >= rows.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === "Enter") {
      const row = rows[activeIndex];
      if (open && row) {
        event.preventDefault();
        go(row.href);
      } else {
        submit(query);
      }
    }
  };

  const isHero = variant === "hero";
  const isMobile = variant === "mobile";

  const activeRow = open ? rows[activeIndex] : undefined;

  const inputSize = isHero
    ? "h-13 sm:h-14 pl-12 pr-14 text-base sm:text-[1.0625rem] rounded-2xl"
    : isMobile
      ? "h-11 pl-10 pr-10 text-sm rounded-xl"
      : "h-10 pl-10 pr-9 text-sm rounded-xl";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(query);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Search deals, stores and categories
        </label>

        <div className="relative">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-400",
              isHero ? "left-4 h-5 w-5" : "left-3.5 h-4 w-4",
            )}
            aria-hidden
          />

          <input
            id={inputId}
            ref={inputRef}
            type="search"
            value={query}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={placeholder ?? PLACEHOLDERS[variant]}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={open && rows.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeRow ? `${listboxId}-${activeRow.key}` : undefined}
            className={cn(
              "w-full border bg-white text-ink-900 shadow-xs outline-none",
              "placeholder:text-ink-400",
              "transition-[border-color,box-shadow] duration-150",
              "focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
              isHero
                ? "border-ink-200 shadow-card focus:shadow-card-hover"
                : "border-ink-200",
              inputSize,
              // Native search clear button is hidden in favour of our own.
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />

          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              isHero ? "right-4" : "right-2.5",
            )}
          >
            {loading ? (
              <Loader2
                className={cn("animate-spin text-brand-500", isHero ? "h-5 w-5" : "h-4 w-4")}
                aria-hidden
              />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setRows([]);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className={cn(
                  "flex items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700",
                  isHero ? "h-7 w-7" : "h-6 w-6",
                )}
              >
                <X className={isHero ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        {isHero ? (
          <button
            type="submit"
            className={cn(
              "mt-3 w-full rounded-xl bg-ink-900 px-6 py-3 text-sm font-semibold text-white",
              "transition-colors hover:bg-ink-800 active:scale-[0.99] sm:mt-0 sm:absolute sm:right-2 sm:top-2 sm:w-auto sm:py-2.5",
            )}
          >
            Search deals
          </button>
        ) : null}
      </form>

      {/* ── results ─────────────────────────────────────────────────────── */}
      {open && trimmed.length >= MIN_CHARS ? (
        <div
          className={cn(
            "animate-pop-in absolute z-50 mt-2 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop",
            "left-0 right-0",
          )}
        >
          {loading && rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-500">Searching…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-500">
              {failed
                ? "Suggestions are unavailable — press Enter to search anyway."
                : `No matches for “${trimmed}”. Press Enter to search all deals.`}
            </p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="max-h-[70vh] overflow-y-auto py-1.5">
              {rows.map((row, index) => (
                <li key={row.key} id={`${listboxId}-${row.key}`} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(row.href)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      index === activeIndex ? "bg-ink-50" : "bg-transparent",
                    )}
                  >
                    <RowIcon row={row} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {row.label}
                      </span>
                      <span className="block truncate text-xs text-ink-500">{row.meta}</span>
                    </span>
                    {row.kind !== "all" ? (
                      <span className="shrink-0 text-[0.6875rem] font-semibold tracking-wide text-ink-400 uppercase">
                        {row.kind === "merchant" ? "Store" : row.kind === "category" ? "Category" : "Deal"}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RowIcon({ row }: { row: Row }) {
  if (row.kind === "merchant") {
    return (
      <MerchantLogo
        name={row.hit.name}
        brandColor={row.hit.brandColor}
        logoUrl={row.hit.logoUrl}
        size="sm"
      />
    );
  }

  const Icon = row.kind === "category" ? Tag : row.kind === "coupon" ? Ticket : Search;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

function buildRows(data: SuggestResponse, term: string): Row[] {
  const rows: Row[] = [];

  for (const merchant of data.merchants) {
    rows.push({
      kind: "merchant",
      key: `m-${merchant.slug}`,
      href: `/stores/${merchant.slug}`,
      label: merchant.name,
      meta: `${merchant.couponCount} live offer${merchant.couponCount === 1 ? "" : "s"}`,
      hit: merchant,
    });
  }

  for (const category of data.categories) {
    rows.push({
      kind: "category",
      key: `c-${category.slug}`,
      href: `/categories/${category.slug}`,
      label: category.name,
      meta: `${category.couponCount} live offer${category.couponCount === 1 ? "" : "s"}`,
      hit: category,
    });
  }

  for (const coupon of data.coupons) {
    rows.push({
      kind: "coupon",
      key: `d-${coupon.slug}`,
      href: `/coupon/${coupon.slug}`,
      label: coupon.title,
      meta: coupon.merchantName,
    });
  }

  rows.push({
    kind: "all",
    key: "all",
    href: `/deals?q=${encodeURIComponent(term)}`,
    label: `Search all deals for “${term}”`,
    meta: "",
  });

  // Put exact store matches first — that is usually the intent.
  return rows.slice(0, 9);
}
