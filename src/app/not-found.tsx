import type { Metadata } from "next";
import { Compass } from "lucide-react";
import Link from "next/link";

import { SearchBar } from "@/components/search/search-bar";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
          <Compass className="h-7 w-7" aria-hidden />
        </span>

        <p className="mt-6 text-[0.6875rem] font-bold tracking-[0.16em] text-brand-600 uppercase">
          404
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          The offer may have expired and been removed, or the link might be
          mistyped. Try searching for the store instead.
        </p>

        <div className="mt-7">
          <SearchBar variant="hero" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/deals"
            className="inline-flex h-10 items-center rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Browse all deals
          </Link>
          <Link
            href="/stores"
            className="inline-flex h-10 items-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            All stores
          </Link>
          <Link
            href="/categories"
            className="inline-flex h-10 items-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            Categories
          </Link>
        </div>
      </div>
    </div>
  );
}
