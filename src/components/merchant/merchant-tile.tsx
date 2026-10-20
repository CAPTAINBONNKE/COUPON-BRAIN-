import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { MerchantLogo } from "@/components/merchant/merchant-logo";
import type { MerchantWithCount } from "@/db/queries";
import { cn, pluralize } from "@/lib/utils";

/** Compact store entry point: wordmark, name, live offer count. */
export function MerchantTile({
  merchant,
  className,
}: {
  merchant: MerchantWithCount;
  className?: string;
}) {
  return (
    <Link
      href={`/stores/${merchant.slug}`}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-xs",
        "transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "snap-start",
        className,
      )}
    >
      <MerchantLogo
        name={merchant.name}
        brandColor={merchant.brandColor}
        logoUrl={merchant.logoUrl}
        size="md"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 group-hover:text-brand-700">
          {merchant.name}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {merchant.couponCount > 0 ? pluralize(merchant.couponCount, "offer") : "No live offers"}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-ink-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand-500"
        aria-hidden
      />
    </Link>
  );
}
