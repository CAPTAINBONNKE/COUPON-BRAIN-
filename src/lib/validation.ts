import { z } from "zod";

/**
 * Server-side validation for every user-supplied value.
 *
 * Front-end validation is a convenience; these schemas are the authority.
 * Anything that reaches a query is bounded, typed and coerced here.
 */

/** searchParams can repeat a key; keep the first value. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export function flattenSearchParams(params: RawSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const single = firstValue(value)?.trim();
    if (single) out[key] = single;
  }
  return out;
}

/* ── browse / search ──────────────────────────────────────────────────────── */

export const SORT_OPTIONS = ["relevance", "popular", "newest", "ending", "discount"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Best match",
  popular: "Most used",
  newest: "Newest",
  ending: "Ending soon",
  discount: "Biggest discount",
};

export const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
export const DEFAULT_PAGE_SIZE = 12;

const slugField = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9-]*$/, "Invalid identifier");

export const dealQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: slugField.optional(),
  merchant: slugField.optional(),
  /** 'code' = must enter a code, 'deal' = auto-applied */
  type: z.enum(["code", "deal"]).optional(),
  verified: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  minDiscount: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(["active", "expired", "all"]).default("active"),
  sort: z.enum(SORT_OPTIONS).default("relevance"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce.number().int().refine((n) => (PAGE_SIZE_OPTIONS as readonly number[]).includes(n), "Invalid page size").default(DEFAULT_PAGE_SIZE),
});

export type DealQuery = z.infer<typeof dealQuerySchema>;

/** Never throws: invalid input degrades to the documented defaults. */
export function parseDealQuery(params: RawSearchParams): DealQuery {
  const result = dealQuerySchema.safeParse(flattenSearchParams(params));
  if (result.success) return result.data;
  return dealQuerySchema.parse({});
}

/* ── analytics events ─────────────────────────────────────────────────────── */

export const eventPayloadSchema = z.object({
  type: z.enum(["view", "copy", "click", "search", "merchant_view", "category_view"]),
  couponId: z.coerce.number().int().positive().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  /** Bounded so an abusive client cannot stuff huge strings into the payload. */
  q: z.string().trim().max(120).optional(),
});

export type EventPayload = z.infer<typeof eventPayloadSchema>;

/* ── autocomplete ─────────────────────────────────────────────────────────── */

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

/* ── misc ─────────────────────────────────────────────────────────────────── */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce.number().int().min(1).max(60).default(24),
});
