import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The single button primitive. Every interactive element that looks like a
 * button uses this, so hover/focus/active behaviour is identical everywhere.
 */

type Variant = "primary" | "secondary" | "ghost" | "success" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 focus-visible:outline-brand-600",
  secondary:
    "bg-ink-900 text-white shadow-sm hover:bg-ink-800 active:bg-ink-950 focus-visible:outline-ink-900",
  success:
    "bg-save-600 text-white shadow-sm hover:bg-save-700 active:bg-save-800 focus-visible:outline-save-600",
  outline:
    "bg-white text-ink-800 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100 active:bg-ink-200",
  danger:
    "bg-danger-600 text-white shadow-sm hover:bg-danger-700 active:bg-danger-700 focus-visible:outline-danger-600",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem] rounded-lg",
  md: "h-10 gap-2 px-4 text-sm rounded-xl",
  lg: "h-12 gap-2 px-6 text-[0.9375rem] rounded-xl",
};

const BASE =
  "inline-flex select-none items-center justify-center font-semibold whitespace-nowrap " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ComponentProps<"button">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ComponentProps<typeof Link>;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}

/** Same visual language, for anchors that must not use next/link. */
export function ButtonAnchor({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ComponentProps<"a">) {
  return (
    <a className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </a>
  );
}
