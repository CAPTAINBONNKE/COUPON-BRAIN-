import {
  Baby,
  Dumbbell,
  GraduationCap,
  Gamepad2,
  Laptop,
  PawPrint,
  Plane,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Category → icon mapping. The database stores the icon NAME (a string), the UI
 * owns the mapping so a bad value can never break a render.
 */
const ICONS: Record<string, LucideIcon> = {
  Shirt,
  Smartphone,
  Plane,
  UtensilsCrossed,
  Sparkles,
  Sofa,
  Dumbbell,
  Laptop,
  GraduationCap,
  Gamepad2,
  PawPrint,
  Baby,
  Tag,
};

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Tag;
}

type Accent = "brand" | "save" | "alert" | "danger";

const ACCENTS: Record<Accent, string> = {
  brand: "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
  save: "bg-save-50 text-save-600 group-hover:bg-save-100",
  alert: "bg-alert-50 text-alert-600 group-hover:bg-alert-100",
  danger: "bg-danger-50 text-danger-600 group-hover:bg-danger-100",
};

function isAccent(value: string | null | undefined): value is Accent {
  return value === "brand" || value === "save" || value === "alert" || value === "danger";
}

export function CategoryIcon({
  icon,
  accent,
  className,
  strokeWidth,
  size = "md",
}: {
  icon: string;
  accent?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
} & Pick<ComponentProps<LucideIcon>, "strokeWidth">) {
  const Icon = getCategoryIcon(icon);
  const tone = ACCENTS[isAccent(accent) ? accent : "brand"];

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-xl transition-colors",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-11 w-11",
        size === "lg" && "h-14 w-14",
        className?.includes("bg-") ? "" : tone,
        className,
      )}
    >
      <Icon
        className={cn(
          size === "sm" && "h-4 w-4",
          size === "md" && "h-5 w-5",
          size === "lg" && "h-6 w-6",
        )}
        strokeWidth={strokeWidth ?? 2}
        aria-hidden
      />
    </span>
  );
}
