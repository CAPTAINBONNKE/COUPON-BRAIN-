"use client";

import { Bookmark } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SAVED_EVENT, isSaved, toggleSaved, type SavedCoupon } from "@/lib/saved";
import { cn } from "@/lib/utils";

/**
 * Save / unsave a deal for later. Stored on the device (see lib/saved.ts).
 * The icon is filled when saved, so state is not communicated by colour alone.
 */
export function SaveButton({
  coupon,
  className,
  showLabel = false,
}: {
  coupon: Omit<SavedCoupon, "savedAt">;
  className?: string;
  showLabel?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read localStorage only after mount so server and client markup match.
  useEffect(() => {
    setMounted(true);
    setSaved(isSaved(coupon.slug));

    const sync = () => setSaved(isSaved(coupon.slug));
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [coupon.slug]);

  const onToggle = useCallback(() => {
    const next = toggleSaved(coupon);
    setSaved(next);
  }, [coupon]);

  return (
    <button
      type="button"
      onClick={onToggle}
      // Until mounted we cannot know the state; avoid asserting either way.
      aria-pressed={mounted ? saved : undefined}
      aria-label={saved ? `Remove ${coupon.title} from saved deals` : `Save ${coupon.title} for later`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        showLabel ? "h-9 px-3" : "h-8 w-8 justify-center",
        saved
          ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
          : "text-ink-400 hover:bg-ink-100 hover:text-ink-700",
        className,
      )}
    >
      <Bookmark
        className={cn("h-4 w-4 transition-transform duration-150", saved && "scale-110")}
        strokeWidth={2.25}
        fill={saved ? "currentColor" : "none"}
        aria-hidden
      />
      {showLabel ? <span>{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
