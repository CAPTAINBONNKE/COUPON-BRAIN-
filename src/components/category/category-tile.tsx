import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CategoryIcon } from "@/components/category/category-icon";
import type { CategoryWithCount } from "@/db/queries";
import { cn, pluralize } from "@/lib/utils";

/** Category card used on the homepage grid and the categories index. */
export function CategoryTile({
  category,
  size = "default",
}: {
  category: CategoryWithCount;
  size?: "default" | "large";
}) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-ink-100 bg-white shadow-xs",
        "transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        size === "large" ? "p-5" : "p-4",
      )}
    >
      <CategoryIcon icon={category.icon} accent={category.accent} size={size === "large" ? "lg" : "md"} />

      <h3 className="mt-3.5 text-sm font-bold text-ink-900 group-hover:text-brand-700">
        {category.name}
      </h3>

      {size === "large" && category.description ? (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
          {category.description}
        </p>
      ) : null}

      <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-ink-500">
        {category.couponCount > 0 ? pluralize(category.couponCount, "live offer") : "None right now"}
        <ArrowRight
          className="h-3.5 w-3.5 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </p>
    </Link>
  );
}
