"use client";

import { AlertTriangle, ArrowUpRight, Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { copyText } from "@/lib/clipboard";
import { trackEvent } from "@/lib/track";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

/**
 * The primary action block on a coupon's own page: a large code panel that
 * copies on click, plus the outbound link.
 *
 * Same contract as the card actions — the success state is only shown when the
 * clipboard write actually succeeded.
 */
export function CouponDetailActions({
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

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    const ok = await copyText(code);
    setState(ok ? "copied" : "failed");
    if (ok) trackEvent({ type: "copy", couponId });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? 3000 : 5000);
  }, [code, couponId]);

  if (status !== "active") {
    return (
      <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 text-center">
        <p className="text-sm font-semibold text-ink-700">
          {status === "expired"
            ? "This offer has expired"
            : status === "scheduled"
              ? "This offer has not started yet"
              : "This offer is no longer available"}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          You can still visit {storeName} to see what is live today.
        </p>
        <a
          href={`/go/${slug}`}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-100"
        >
          Visit {storeName}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <p className="text-sm text-ink-600">
          No code needed — this offer is applied automatically when you follow
          the link.
        </p>
        <a
          href={`/go/${slug}`}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          onClick={() => trackEvent({ type: "click", couponId })}
          className={cn(
            "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-5",
            "text-sm font-semibold text-white transition-all duration-150 hover:bg-ink-800 active:scale-[0.99]",
          )}
        >
          Get this deal at {storeName}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
        {state === "copied" ? "Code copied" : "Use this code at checkout"}
      </p>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy code ${code}`}
        className={cn(
          "group mt-2 flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-3.5",
          "transition-all duration-150 active:scale-[0.99]",
          state === "copied"
            ? "border-save-400 bg-save-50"
            : state === "failed"
              ? "border-danger-300 bg-danger-50"
              : "border-ink-300 bg-ink-50/60 hover:border-brand-400 hover:bg-brand-50",
        )}
      >
        <span
          className={cn(
            "truncate font-mono text-xl font-bold tracking-[0.12em]",
            state === "copied"
              ? "text-save-700"
              : state === "failed"
                ? "text-danger-700"
                : "text-ink-900",
          )}
        >
          {code}
        </span>

        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase transition-colors",
            state === "copied"
              ? "bg-save-600 text-white"
              : state === "failed"
                ? "bg-danger-600 text-white"
                : "bg-ink-900 text-white group-hover:bg-brand-600",
          )}
        >
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

      <p aria-live="polite" className="mt-2 min-h-4 text-center text-xs font-medium">
        {state === "copied" ? (
          <span className="text-save-700">Paste it in the promo code box at checkout.</span>
        ) : state === "failed" ? (
          <span className="text-danger-700">
            Your browser blocked the copy — select the code and press Ctrl/Cmd + C.
          </span>
        ) : null}
      </p>

      <a
        href={`/go/${slug}`}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        onClick={() => trackEvent({ type: "click", couponId })}
        className={cn(
          "mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5",
          "text-sm font-semibold text-white transition-all duration-150 hover:bg-brand-700 active:scale-[0.99]",
        )}
      >
        Continue to {storeName}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}
