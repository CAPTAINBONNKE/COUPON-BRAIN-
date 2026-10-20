"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { copyText } from "@/lib/clipboard";
import { trackEvent } from "@/lib/track";
import { cn } from "@/lib/utils";

/**
 * Compact icon-only copy control for dense lists.
 *
 * Shares the same rule as the full-size coupon actions: the success state is
 * shown only when the clipboard write actually succeeded.
 */
export function CopyButton({
  code,
  couponId,
  label,
  className,
}: {
  code: string;
  couponId: number;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const onClick = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const ok = await copyText(code);
      if (ok) trackEvent({ type: "copy", couponId });

      setCopied(ok);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    },
    [code, couponId],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? `Copied code ${code}` : `Copy code ${code} for ${label}`}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95",
        copied
          ? "border-save-300 bg-save-50 text-save-700"
          : "border-ink-200 bg-white text-ink-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
