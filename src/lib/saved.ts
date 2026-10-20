"use client";

/**
 * "Saved" deals.
 *
 * There are no user accounts in this build, so saved deals live on the device
 * in localStorage. This is a UI preference, NOT a data store: only a small
 * snapshot needed to render the list is kept, and /saved re-reads full coupon
 * details from the database every time so prices, codes and expiry stay
 * accurate. When accounts arrive, this moves behind a saved_coupons table and
 * the page keeps working unchanged.
 */

export type SavedCoupon = {
  slug: string;
  title: string;
  code: string | null;
  merchantName: string;
  merchantSlug: string;
  discountType: string;
  discountValue: number | null;
  currency: string;
  expiresAt: string | null;
  savedAt: string;
};

export const SAVED_KEY = "cb:saved:v1";
export const SAVED_EVENT = "cb:saved-changed";
export const SAVED_LIMIT = 200;

function readAll(): SavedCoupon[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedCoupon).slice(0, SAVED_LIMIT);
  } catch {
    // Corrupt or blocked storage (private mode) must not break the page.
    return [];
  }
}

function isSavedCoupon(value: unknown): value is SavedCoupon {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.slug === "string" && typeof item.title === "string";
}

function writeAll(items: SavedCoupon[]): void {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(items.slice(0, SAVED_LIMIT)));
  } catch {
    // Storage full or unavailable — the in-memory UI state still works.
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function getSaved(): SavedCoupon[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function getSavedSlugs(): string[] {
  return getSaved().map((item) => item.slug);
}

export function isSaved(slug: string): boolean {
  return readAll().some((item) => item.slug === slug);
}

/** Returns the new saved state. */
export function toggleSaved(item: Omit<SavedCoupon, "savedAt">): boolean {
  const items = readAll();
  const index = items.findIndex((entry) => entry.slug === item.slug);

  if (index >= 0) {
    items.splice(index, 1);
    writeAll(items);
    return false;
  }

  writeAll([{ ...item, savedAt: new Date().toISOString() }, ...items]);
  return true;
}

export function clearSaved(): void {
  writeAll([]);
}
