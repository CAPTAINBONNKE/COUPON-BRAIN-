import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Status + metadata chips. Colour is never the only signal — every badge also
 * carries text, so the information survives colour-blindness and greyscale.
 */

type Tone = "brand" | "save" | "alert" | "danger" | "neutral" | "inverse";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  save: "bg-save-50 text-save-700 border-save-200",
  alert: "bg-alert-50 text-alert-700 border-alert-200",
  danger: "bg-danger-50 text-danger-700 border-danger-200",
  neutral: "bg-ink-50 text-ink-600 border-ink-200",
  inverse: "bg-ink-900/85 text-white border-transparent backdrop-blur-sm",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
