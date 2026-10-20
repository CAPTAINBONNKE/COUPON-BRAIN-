import type { Metadata } from "next";
import { Timer } from "lucide-react";
import Link from "next/link";

import { CouponGrid } from "@/components/coupon/coupon-grid";
import { getEndingSoon } from "@/db/queries";
import { absoluteUrl } from "@/lib/env";
import { itemListJsonLd, jsonLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ending soon — deals expiring this week",
  description:
    "Coupon codes and offers that expire in the next seven days, soonest first. Expiry is decided server-side, so these are genuinely still live.",
  alternates: { canonical: absoluteUrl("/deals/ending-soon") },
};

export default async function EndingSoonPage() {
  const result = await getEndingSoon(24);
  const now = new Date();

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
            <li>
              <Link href="/deals" className="hover:text-brand-700">
                Deals
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-700">Ending soon</li>
          </ol>
        </nav>

        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-alert-50 px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.12em] text-alert-700 uppercase">
          <Timer className="h-3.5 w-3.5" aria-hidden />
          Last chance
        </p>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Deals ending in the next 7 days
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Sorted by what runs out first. Offers with no end date are not included
          here — they are not going anywhere.
        </p>
      </header>

      <div className="mt-7">
        <CouponGrid
          coupons={result.items}
          now={now}
          emptyTitle="Nothing is expiring this week"
          emptyDescription="Every live offer is either ongoing or has more than a week left. Browse all deals to see them."
        />
      </div>

      {result.items.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              itemListJsonLd(
                result.items.map((coupon) => ({
                  name: `${coupon.merchant.name}: ${coupon.title}`,
                  url: absoluteUrl(`/coupon/${coupon.slug}`),
                })),
                "Deals ending soon",
              ),
            ),
          }}
        />
      ) : null}
    </div>
  );
}
