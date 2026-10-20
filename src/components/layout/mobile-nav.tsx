"use client";

import { ArrowRight, LayoutGrid, Tag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation drawer.
 *
 * Deliberately NOT a shrunk-down desktop header: it is a full-height sheet with
 * large touch targets, its own visual hierarchy and direct access to the two
 * things people actually do on a phone — browse by category and browse by store.
 */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on path change
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-ink-950/40 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col overflow-y-auto bg-white shadow-pop outline-none"
        style={{ animation: "slide-in 0.24s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-100 px-4">
          <span className="text-sm font-bold tracking-wide text-ink-900 uppercase">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {PRIMARY_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                      active
                        ? "bg-brand-50 text-brand-800"
                        : "text-ink-800 hover:bg-ink-50",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        active ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500",
                      )}
                    >
                      <Tag className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      {item.description ? (
                        <span className="block truncate text-xs text-ink-500">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 h-px bg-ink-100" />

          <Link
            href="/saved"
            className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-ink-800 transition-colors hover:bg-ink-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold">Saved deals</span>
          </Link>
        </nav>

        <div className="shrink-0 border-t border-ink-100 p-4">
          <p className="text-xs leading-relaxed text-ink-500">
            COUPON BRAIN checks expiry dates server-side, so a deal marked live
            was live when the page loaded.
          </p>
        </div>
      </div>
    </div>
  );
}
