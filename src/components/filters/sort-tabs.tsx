import Link from "next/link";

import { buildDealsHref, type DealQueryUpdates } from "@/lib/deal-url";
import { SORT_LABELS, SORT_OPTIONS, type DealQuery, type SortOption } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Sorting as a row of links (rather than a <select>) so it is visible, works
 * without JavaScript, and produces a shareable URL.
 *
 * "Best match" is only offered when there is something to match against — with
 * no search term it would silently mean "most used".
 */
export function SortTabs({
  query,
  basePath = "/deals",
}: {
  query: DealQuery;
  basePath?: string;
}) {
  const options = SORT_OPTIONS.filter(
    (option) => option !== "relevance" || Boolean(query.q),
  );

  const current: SortOption = options.includes(query.sort) ? query.sort : options[0] ?? "popular";

  return (
    <div
      role="group"
      aria-label="Sort deals"
      className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {options.map((option) => {
        const active = option === current;
        return (
          <Link
            key={option}
            href={buildDealsHref(query, { sort: option } as DealQueryUpdates, basePath)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              active
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900",
            )}
          >
            {SORT_LABELS[option]}
          </Link>
        );
      })}
    </div>
  );
}
