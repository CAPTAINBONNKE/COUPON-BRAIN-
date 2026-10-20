import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryIcon } from "@/components/category/category-icon";
import { CategoryTile } from "@/components/category/category-tile";
import { CouponGrid } from "@/components/coupon/coupon-grid";
import { SortTabs } from "@/components/filters/sort-tabs";
import { Pagination } from "@/components/ui/pagination";
import {
  getCategoryBySlug,
  getCategoryDeals,
  getRelatedCategories,
} from "@/db/queries";
import { buildDealsHref } from "@/lib/deal-url";
import { absoluteUrl } from "@/lib/env";
import { breadcrumbJsonLd, itemListJsonLd, jsonLd } from "@/lib/jsonld";
import { truncate } from "@/lib/utils";
import type { RawSearchParams } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

function describe(description: string, name: string): string {
  const base = description.trim() || `Live ${name.toLowerCase()} offers`;
  return truncate(`${base} Verified codes and deals, checked server-side.`, 158);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) return { title: "Category not found" };

  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false, follow: true } };

  const title = `${category.name} coupon codes & deals`;
  const description = describe(category.description, category.name);

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/categories/${category.slug}`) },
    openGraph: {
      title: `${title} | COUPON BRAIN`,
      description,
      url: absoluteUrl(`/categories/${category.slug}`),
      type: "website",
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const search = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [result, siblings] = await Promise.all([
    getCategoryDeals(slug, search),
    getRelatedCategories(category.id, 4),
  ]);

  const now = new Date();
  const { items, total, page, totalPages, query } = result;

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbJsonLd([
              { name: "Home", url: absoluteUrl("/") },
              { name: "Categories", url: absoluteUrl("/categories") },
              { name: category.name, url: absoluteUrl(`/categories/${category.slug}`) },
            ]),
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-ink-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/categories" className="hover:text-brand-700">
              Categories
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-ink-700">{category.name}</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CategoryIcon icon={category.icon} accent={category.accent} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {category.name} coupon codes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            {category.description ||
              `Live ${category.name.toLowerCase()} offers from the stores we track.`}
          </p>
        </div>
        <p className="shrink-0 rounded-xl border border-ink-100 bg-white px-4 py-3 text-center shadow-xs">
          <span className="block text-2xl font-extrabold text-ink-900 tabular">{total}</span>
          <span className="block text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase">
            Live offers
          </span>
        </p>
      </header>

      <div className="mt-7 flex items-center justify-between gap-3">
        <SortTabs query={query} basePath={`/categories/${category.slug}`} />
        <span className="hidden shrink-0 text-xs text-ink-500 sm:block">
          {total === 0 ? "No live offers" : `${total} live offer${total === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="mt-5">
        <CouponGrid
          coupons={items}
          now={now}
          emptyTitle={`No live ${category.name.toLowerCase()} offers right now`}
          emptyDescription="This category has no currently active deals. Try another category, or browse everything that is live."
        />
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(nextPage) =>
          buildDealsHref(query, { page: nextPage }, `/categories/${category.slug}`)
        }
      />

      {siblings.length > 0 ? (
        <section className="mt-14" aria-labelledby="other-categories">
          <h2
            id="other-categories"
            className="mb-4 text-lg font-extrabold tracking-tight text-ink-900"
          >
            Other categories
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {siblings.map((item) => (
              <CategoryTile key={item.slug} category={item} />
            ))}
          </div>
        </section>
      ) : null}

      {items.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              itemListJsonLd(
                items.map((coupon) => ({
                  name: truncate(`${coupon.merchant.name}: ${coupon.title}`, 110),
                  url: absoluteUrl(`/coupon/${coupon.slug}`),
                })),
                `${category.name} deals`,
              ),
            ),
          }}
        />
      ) : null}
    </div>
  );
}
