import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Every data-driven surface gets one of these. It always answers two questions:
 * what happened, and what can you do next?
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "danger";
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-2xl border border-dashed text-center",
        tone === "danger"
          ? "border-danger-200 bg-danger-50/60"
          : "border-ink-200 bg-white/70",
        compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-14 sm:py-20",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          tone === "danger" ? "bg-danger-100 text-danger-600" : "bg-ink-100 text-ink-500",
        ].join(" ")}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </span>

      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
