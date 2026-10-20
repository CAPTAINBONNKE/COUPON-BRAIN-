import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Standard page section: consistent vertical rhythm, heading hierarchy and an
 * optional "view all" affordance. Every homepage block uses this so spacing
 * never drifts between sections.
 */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel = "View all",
  action,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={cn("scroll-mt-24", className)}
    >
      <div className="container-page">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6">
          <div className="min-w-0 max-w-2xl">
            {eyebrow ? (
              <p className="mb-1.5 text-[0.6875rem] font-bold tracking-[0.14em] text-brand-600 uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={id ? `${id}-heading` : undefined}
              className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{subtitle}</p>
            ) : null}
          </div>

          {href ? (
            <Link
              href={href}
              className="group/link inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              {linkLabel}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover/link:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ) : action ? (
            action
          ) : null}
        </header>

        {children}
      </div>
    </section>
  );
}

/** Horizontal scrolling rail that snaps on touch, used for stores on mobile. */
export function ScrollRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
