"use client";

import { Bookmark, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Logo } from "@/components/layout/logo";
import { SearchBar } from "@/components/search/search-bar";
import { SAVED_EVENT, getSaved } from "@/lib/saved";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Site header.
 *
 * Three deliberate layouts rather than one that just shrinks:
 *  • lg and up  → logo + inline nav + persistent search
 *  • md to lg   → logo + compact search (no room for the nav row)
 *  • below md   → logo + search icon + menu, with navigation living in the
 *                 bottom bar and the drawer
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

  // Close the mobile search when navigating elsewhere.
  useEffect(() => setSearchOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center gap-3 sm:gap-4">
          <Logo />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href} className={item.wideOnly ? "hidden xl:block" : undefined}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition-colors",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <div className="hidden w-full max-w-xs md:block lg:max-w-sm xl:max-w-md">
              <SearchBar variant="header" />
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              aria-expanded={searchOpen}
              aria-controls="mobile-search"
              aria-label={searchOpen ? "Close search" : "Open search"}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 md:hidden"
            >
              {searchOpen ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Search className="h-5 w-5" aria-hidden />
              )}
            </button>

            <Link
              href="/saved"
              className={cn(
                "relative hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors sm:flex",
                isActive("/saved")
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
              )}
            >
              <Bookmark
                className="h-4 w-4"
                fill={savedCount > 0 ? "currentColor" : "none"}
                aria-hidden
              />
              <span className="hidden xl:inline">Saved</span>
              {savedCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[0.6875rem] font-bold text-white tabular">
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              ) : null}
              <span className="sr-only">
                {savedCount > 0 ? `${savedCount} saved deals` : "Saved deals"}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Mobile search panel — full width, autofocused, dismissible. */}
        {searchOpen ? (
          <div
            id="mobile-search"
            className="animate-slide-up border-t border-ink-100 bg-white p-3 md:hidden"
          >
            <SearchBar variant="mobile" autoFocus />
          </div>
        ) : null}
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
