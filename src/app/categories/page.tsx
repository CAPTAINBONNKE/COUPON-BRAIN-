import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";

import { CategoryTile } from "@/components/category/category-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoriesWithCounts } from "@/db/queries";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coupon categories — browse deals by what you're buying",
  description:
    "Browse coupon codes and deals by category: fashion, electronics, travel, food, beauty, home, sports, software, learning, gaming, pets and kids.",
  alternates: { canonical: absoluteUrl("/categories") },
};

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();
  const totalOffers = categories.reduce((sum, category) => sum + category.couponCount, 0);

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
            <li className="font-medium text-ink-700">Categories</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Browse by category
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {categories.length} categories holding {totalOffers} live offers. Every
          count below is generated from the database right now.
        </p>
      </header>

      {categories.length > 0 ? (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryTile key={category.slug} category={category} size="large" />
          ))}
        </div>
      ) : (
        <div className="mt-7">
          <EmptyState
            icon={LayoutGrid}
            title="No categories yet"
            description="Categories appear here as soon as offers are assigned to them."
          />
        </div>
      )}
    </div>
  );
}
