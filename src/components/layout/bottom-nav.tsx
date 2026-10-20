"use client";

import { Bookmark, Home, LayoutGrid, Tag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SAVED_EVENT, getSaved } from "@/lib/saved";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom navigation — thumb-reachable, always visible, and the primary
 * way to move around on a phone. Hidden from lg up, where the header nav takes
 * over. The body has matching bottom padding so nothing is ever obscured.
 */
const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/deals", label: "Deals", icon: Tag },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/saved", label: "Saved", icon: Bookmark },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const sync = () => setSavedCount(getSaved().length);
    sync();
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  active ? "text-brand-700" : "text-ink-500 active:bg-ink-50",
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                    strokeWidth={active ? 2.5 : 2}
                    fill={item.href === "/saved" && savedCount > 0 ? "currentColor" : "none"}
                    aria-hidden
                  />
                  {item.href === "/saved" && savedCount > 0 ? (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.5625rem] font-bold text-white tabular">
                      {savedCount > 99 ? "99+" : savedCount}
                    </span>
                  ) : null}
                </span>
                <span className="text-[0.6875rem] font-semibold">{item.label}</span>
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand-600"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
