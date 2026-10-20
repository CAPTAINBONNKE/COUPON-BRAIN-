import type { DealQuery } from "./validation";

/**
 * Builds `/deals` URLs from the parsed query.
 *
 * Defaults are omitted so canonical URLs stay short and shareable, and every
 * filter change resets pagination — landing on page 4 of a 1-page result set is
 * the classic way to make filters look broken.
 */

export type DealQueryUpdates = Partial<
  Pick<
    DealQuery,
    "q" | "category" | "merchant" | "type" | "verified" | "minDiscount" | "status" | "sort"
  >
> & { page?: number; perPage?: number };

export function buildDealsHref(
  current: DealQuery,
  updates: DealQueryUpdates = {},
  basePath = "/deals",
): string {
  const merged = { ...current, ...updates };
  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.merchant) params.set("merchant", merged.merchant);
  if (merged.type) params.set("type", merged.type);
  if (merged.verified) params.set("verified", "true");
  if (merged.minDiscount) params.set("minDiscount", String(merged.minDiscount));
  if (merged.status && merged.status !== "active") params.set("status", merged.status);
  if (merged.sort && merged.sort !== "relevance") params.set("sort", merged.sort);

  const page = updates.page ?? 1;
  if (page > 1) params.set("page", String(page));

  if (merged.perPage && merged.perPage !== 12) params.set("perPage", String(merged.perPage));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** How many filters are currently narrowing the results. */
export function activeFilterCount(query: DealQuery): number {
  let count = 0;
  if (query.category) count += 1;
  if (query.merchant) count += 1;
  if (query.type) count += 1;
  if (query.verified) count += 1;
  if (query.minDiscount) count += 1;
  if (query.status !== "active") count += 1;
  return count;
}

export function hasActiveFilters(query: DealQuery): boolean {
  return activeFilterCount(query) > 0;
}
