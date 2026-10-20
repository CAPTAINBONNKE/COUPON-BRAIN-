import { BadgeCheck, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

import { SearchBar } from "@/components/search/search-bar";
import type { MerchantWithCount, PlatformStats } from "@/db/queries";
import { formatCompact } from "@/lib/utils";

/**
 * The one place that explains the product. Value proposition, the search box
 * that does the work, popular entry points, and real numbers — no stock
 * photography, no decoration for its own sake.
 */
export function Hero({
  stats,
  popularStores,
}: {
  stats: PlatformStats;
  popularStores: MerchantWithCount[];
}) {
  const proof = [
    { icon: TrendingUp, label: "Live offers", value: formatCompact(stats.liveCoupons) },
    { icon: BadgeCheck, label: "Verified", value: formatCompact(stats.verifiedCoupons) },
    { icon: Sparkles, label: "Stores", value: formatCompact(stats.merchants) },
  ];

  return (
    <section className="relative overflow-hidden border-b border-ink-100 bg-white">
      {/* Restrained texture: a soft grid plus one brand-tinted glow. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div
          className="absolute -top-32 left-1/2 h-[26rem] w-[52rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, #7C3AED 0%, #10B981 45%, transparent 72%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-50" />
      </div>

      <div className="container-page relative py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-ink-600 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-save-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-save-500" />
            </span>
            {stats.liveCoupons} live offers · checked server-side
          </p>

          <h1 className="animate-rise mt-5 text-3xl leading-[1.1] font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            Find the code.
            <br className="sm:hidden" /> <span className="text-brand-600">Skip the guesswork.</span>
          </h1>

          <p className="animate-rise mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">
            COUPON BRAIN gathers working promo codes and deals from the stores
            you already shop at — then tells you exactly when each one stops
            working, so you never reach checkout with an expired code.
          </p>

          <div className="animate-rise mx-auto mt-7 max-w-2xl">
            <SearchBar variant="hero" />
          </div>

          {popularStores.length > 0 ? (
            <div className="animate-rise mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-ink-500">
              <span className="font-medium text-ink-400">Popular now</span>
              {popularStores.slice(0, 6).map((store) => (
                <Link
                  key={store.slug}
                  href={`/stores/${store.slug}`}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1 font-medium text-ink-700 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-xs"
                >
                  {store.name}
                </Link>
              ))}
            </div>
          ) : null}

          <dl className="animate-rise mx-auto mt-9 grid max-w-lg grid-cols-3 gap-3">
            {proof.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-ink-100 bg-white/80 px-3 py-3 shadow-xs backdrop-blur-sm"
              >
                <dt className="flex items-center justify-center gap-1.5 text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase">
                  <item.icon className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                  {item.label}
                </dt>
                <dd className="mt-1 text-xl font-extrabold text-ink-900 tabular">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
