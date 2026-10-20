import { cn } from "@/lib/utils";

/**
 * Merchant identification without any external image dependency.
 *
 * Most merchants in the catalogue have no logo file, and shipping random stock
 * photography would be worse than nothing. Instead every merchant gets a
 * deterministic wordmark: their brand colour when we know it, otherwise a
 * stable colour derived from their name. Same merchant → same mark, everywhere.
 *
 * If a merchant does have a `logoUrl`, it is layered on top of the wordmark, so
 * a broken or slow image degrades to the wordmark instead of a blank box.
 */

const GRADIENTS = [
  "linear-gradient(135deg,#7C3AED,#A855F7)",
  "linear-gradient(135deg,#059669,#34D399)",
  "linear-gradient(135deg,#D97706,#FBBF24)",
  "linear-gradient(135deg,#DC2626,#F87171)",
  "linear-gradient(135deg,#2563EB,#60A5FA)",
  "linear-gradient(135deg,#DB2777,#F472B6)",
  "linear-gradient(135deg,#0891B2,#22D3EE)",
  "linear-gradient(135deg,#4338CA,#818CF8)",
] as const;

const SIZES = {
  xs: "h-7 w-7 text-[0.625rem] rounded-lg",
  sm: "h-9 w-9 text-[0.6875rem] rounded-lg",
  md: "h-10 w-10 text-xs rounded-xl",
  lg: "h-14 w-14 text-base rounded-2xl",
  xl: "h-16 w-16 text-lg rounded-2xl",
} as const;

function isHexColour(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Perceived brightness (0–1) used to keep the initials legible. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function merchantInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();

  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
}

export function MerchantLogo({
  name,
  brandColor,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  brandColor?: string | null;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = merchantInitials(name);
  const useBrand = isHexColour(brandColor);

  const style = useBrand
    ? { background: brandColor!.trim() }
    : { background: GRADIENTS[hashString(name) % GRADIENTS.length] };

  const textClass = useBrand && luminance(brandColor!) > 0.62 ? "text-ink-900" : "text-white";

  return (
    <span
      role="img"
      aria-label={`${name} logo`}
      style={style}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden font-bold tracking-tight ring-1 ring-black/5",
        SIZES[size],
        textClass,
        className,
      )}
    >
      {initials}
      {logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element -- merchant logos are
           arbitrary remote URLs; next/image would require per-host config, and
           the wordmark behind it is the built-in fallback. */
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-contain bg-white"
        />
      ) : null}
    </span>
  );
}
