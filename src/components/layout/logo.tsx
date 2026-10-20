import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Wordmark. Drawn inline so it loads with the document, needs no asset request
 * and stays crisp at every size.
 */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="COUPON BRAIN home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-900 shadow-sm transition-transform duration-200 group-hover:scale-105">
        {/* A stylised "%" mark: two dots and a stroke. */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
          <circle cx="7.5" cy="7.5" r="2.6" fill="#10B981" />
          <circle cx="16.5" cy="16.5" r="2.6" fill="#10B981" />
          <path
            d="M18.2 5.8 5.8 18.2"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[0.9375rem] font-extrabold tracking-tight text-ink-900">
            COUPON<span className="text-brand-600">BRAIN</span>
          </span>
          <span className="mt-0.5 text-[0.625rem] font-medium tracking-[0.14em] text-ink-400 uppercase">
            Find it. Use it. Save.
          </span>
        </span>
      ) : null}
    </Link>
  );
}
