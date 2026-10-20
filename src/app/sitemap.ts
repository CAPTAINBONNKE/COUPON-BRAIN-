import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/db/queries";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Only indexable, content-bearing pages are listed.
 *
 * Deliberately excluded:
 *  • /saved   — device-local, nothing to crawl
 *  • /go/*    — redirect endpoints, not content
 *  • /api/*   — JSON endpoints
 *  • /deals?q=… — search permutations (also noindex'd in page metadata)
 *
 * Expired coupons are excluded by `getSitemapEntries()`, which only returns
 * live offers, so the sitemap does not advertise dead pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { coupons, merchants, categories } = await getSitemapEntries();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/deals"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/deals/ending-soon"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/categories"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/stores"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      url: absoluteUrl(`/categories/${category.slug}`),
      lastModified: category.updatedAt ?? now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...merchants.map((merchant) => ({
      url: absoluteUrl(`/stores/${merchant.slug}`),
      lastModified: merchant.updatedAt ?? now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...coupons.map((coupon) => ({
      url: absoluteUrl(`/coupon/${coupon.slug}`),
      lastModified: coupon.updatedAt ?? now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
