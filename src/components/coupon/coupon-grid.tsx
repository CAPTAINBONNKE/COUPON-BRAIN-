import { SearchX } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { CouponCard as CouponCardData } from "@/db/queries";

import { CouponCard } from "./coupon-card";

/**
 * Responsive deal grid.
 * 1 column on narrow mobile → 2 on tablet → 3 on desktop, with a 4-column
 * option for dense category pages.
 */
/**
 * Column counts are driven by CONTAINER width, not viewport width.
 *
 * The same grid appears full-bleed on the homepage and inside a 672px column
 * next to the /deals sidebar. Viewport breakpoints would squeeze three cards
 * into 213px each there; container queries keep every card readable wherever
 * it is placed.
 */
export function CouponGrid({
  coupons,
  now,
  columns = 3,
  emptyTitle = "No deals match these filters",
  emptyDescription = "Try removing a filter, or search for a different store.",
  emptyAction,
}: {
  coupons: CouponCardData[];
  now: Date;
  /** Maximum number of columns at the widest container. */
  columns?: 2 | 3 | 4;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  if (coupons.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={emptyTitle}
        description={emptyDescription}
        action={
          emptyAction ?? (
            <ButtonLink href="/deals" variant="outline" size="sm">
              Browse all deals
            </ButtonLink>
          )
        }
      />
    );
  }

  const columnClass =
    columns === 2
      ? "@min-[560px]:grid-cols-2"
      : columns === 4
        ? "@min-[560px]:grid-cols-2 @min-[880px]:grid-cols-3 @min-[1180px]:grid-cols-4"
        : "@min-[560px]:grid-cols-2 @min-[880px]:grid-cols-3";

  return (
    <ul className={`@container grid grid-cols-1 gap-4 ${columnClass}`}>
      {coupons.map((coupon) => (
        <li key={coupon.id} className="contents">
          <CouponCard coupon={coupon} now={now} />
        </li>
      ))}
    </ul>
  );
}
