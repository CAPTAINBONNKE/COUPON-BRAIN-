import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import Link from "next/link";

import { SavedDeals } from "@/components/coupon/saved-deals";
import { absoluteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Saved deals",
  description:
    "Your saved coupon codes and deals, re-checked against the database every time you visit so you never reach checkout with an expired code.",
  // Personal, device-local list — nothing here for a crawler.
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/saved") },
};

export default function SavedPage() {
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
            <li className="font-medium text-ink-700">Saved</li>
          </ol>
        </nav>

        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.12em] text-brand-700 uppercase">
          <Bookmark className="h-3.5 w-3.5" aria-hidden />
          Your list
        </p>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Saved deals
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Stored on this device and re-checked live, so anything that has
          expired is flagged the moment you return.
        </p>
      </header>

      <div className="mt-7">
        <SavedDeals />
      </div>
    </div>
  );
}
