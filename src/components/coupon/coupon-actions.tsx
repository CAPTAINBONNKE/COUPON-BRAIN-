"use client";

import { AlertTriangle, ArrowUpRight, Check, Copy, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { copyText } from "@/lib/clipboard";
import { trackEvent } from "@/lib/track";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

/**
 * The primary coupon interaction: copy the code, then go to the store.
 *
 * Rules this component follows:
 *  • The success state is driven ONLY by whether the clipboard write actually
 *    succeeded. A failed analytics call never turns the button green.
 *  • Copy failures degrade to "select the code manually" instead of silently
 *    doing nothing.
 *  • "Get deal" routes through /go/[slug], which re-validates the coupon
 *    server-side and records the click — the client is never trusted to decide
 *    whether a coupon is still valid.
 */
export function CouponActions({
  couponId,
  slug,
  code,
  status,
  storeName,
}: {
  couponId: number;
  slug: string;
  code: string | null;
  status: "active" | "scheduled" | "expired" | "disabled";
  storeName: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const isUsable = status === "active";

  const handleCopy = useCallback(async () => {
    if (!code) return;

    const ok = await copyText(code);
    setState(ok ? "copied" : "failed");

    if (ok) {
      trackEvent({ type: "copy", couponId });
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? 2600 : 4000);
  }, [code, couponId]);

  if (!isUsable) {
    return (
      <div className="flex flex-col gap-2">
        <span
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold",
            "border-ink-200 bg-ink-50 text-ink-500",
          )}
        >
          {status === "expired" ? "Offer has expired" : "Offer not yet available"}
        </span>
        <p className="text-center text-xs text-ink-500">
          Browse {storeName}&rsquo;s current deals instead.
        </p>
      </div>
    );
  }

  // Deals auto-apply at the destination, so there is no code to copy.
  if (!code) {
    return (
      <a
        href={`/go/${slug}`}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        onClick={() => trackEvent({ type: "click", couponId })}
        className={cn(
          "group/cta flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-4",
          "text-sm font-semibold text-white transition-all duration-150",
          "hover:bg-ink-800 active:scale-[0.985]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
        )}
      >
        Get deal
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-150 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
          aria-hidden
        />
        <span className="sr-only">at {storeName} (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy code ${code} for ${storeName}`}
          className={cn(
            "group/code flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border-2 border-dashed px-3",
            "transition-all duration-150 active:scale-[0.985]",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            state === "copied"
              ? "border-save-400 bg-save-50 text-save-700 focus-visible:outline-save-600"
              : state === "failed"
                ? "border-danger-300 bg-danger-50 text-danger-700 focus-visible:outline-danger-600"
                : "border-ink-200 bg-ink-50/60 text-ink-800 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-brand-600",
          )}
        >
          <span className="truncate font-mono text-sm font-bold tracking-wider">
            {code}
          </span>

          <span className="flex shrink-0 items-center gap-1 text-[0.6875rem] font-semibold uppercase">
            {state === "copied" ? (
              <>
                Copied
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </>
            ) : state === "failed" ? (
              <>
                Select
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              </>
            ) : (
              <>
                Copy
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </span>
        </button>

        <a
          href={`/go/${slug}`}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          onClick={() => trackEvent({ type: "click", couponId })}
          className={cn(
            "group/cta flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5",
            "text-sm font-semibold text-white transition-all duration-150",
            "hover:bg-brand-700 active:scale-[0.985]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
          )}
        >
          Get deal
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">at {storeName} (opens in a new tab)</span>
        </a>
      </div>

      {/* aria-live so screen readers hear the outcome of the copy. */}
      <p
        aria-live="polite"
        className={cn(
          "min-h-4 text-center text-xs font-medium transition-opacity",
          state === "copied" && "text-save-700",
          state === "failed" && "text-danger-700",
          state === "idle" && "text-transparent",
        )}
      >
        {state === "copied"
          ? "Code copied — paste it at checkout"
          : state === "failed"
            ? "Couldn't copy automatically — select the code and press Ctrl+C"
            : " "}
      </p>
    </div>
  );
}
