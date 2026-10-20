import type { Metadata } from "next";
import Link from "next/link";

import { MerchantDirectory } from "@/components/merchant/merchant-directory";
import { getMerchantsWithCounts } from "@/db/queries";
import { absoluteUrl } from "@/lib/env";
import { itemListJsonLd, jsonLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stores — every brand with live coupon codes",
  description:
    "Browse every store we track and see how many live offers each one has right now.",
  alternates: { canonical: absoluteUrl("/stores") },
};

export default async function StoresPage() {
  const merchants = await getMerchantsWithCounts(200);
  const totalOffers = merchants.reduce((sum, merchant) => sum + merchant.couponCount, 0);

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            itemListJsonLd(
              merchants
                .filter((merchant) => merchant.couponCount > 0)
                .map((merchant) => ({
                  name: merchant.name,
                  url: absoluteUrl(`/stores/${merchant.slug}`),
                })),
              "Stores with live coupon codes",
            ),
          ),
        }}
      />

      <header className="max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-ink-500">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand-700">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-700">Stores</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          All stores
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {merchants.length} stores with {totalOffers} live offers between them.
          Ordered by how much is currently available.
        </p>
      </header>

      <div className="mt-7">
        <MerchantDirectory merchants={merchants} />
      </div>
    </div>
  );
}
