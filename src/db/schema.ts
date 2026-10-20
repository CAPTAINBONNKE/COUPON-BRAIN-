import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * COUPON BRAIN — database schema (PostgreSQL; Supabase compatible).
 *
 * SOURCE OF TRUTH
 * ---------------
 *  • `merchants` / `categories` / `coupons` / `coupon_categories` are the
 *    authoritative records.
 *  • `events` is the authoritative, append-only log of every user interaction.
 *  • The `*_count` columns on `coupons` are a deliberate CACHE of aggregates
 *    derived from `events`. They exist so listings can be sorted by popularity
 *    without aggregating millions of event rows on every request.
 *    SOURCE OF TRUTH (events) → CACHE (coupons.*_count) → APPLICATION.
 *    Invalidation: the counters are incremented in the same transaction as the
 *    event insert, and `npm run db:recount` rebuilds them from scratch.
 *  • `search_document` / `search_vector` on `coupons` are a SEARCH INDEX cache
 *    over title + merchant + categories + code, maintained on write.
 *
 * COUPON VALIDITY
 * ---------------
 *  A coupon's status is DERIVED, never stored (storing it would duplicate state
 *  and go stale). See `couponStatusSql()` in src/db/coupon-status.ts:
 *      disabled  ← coupons.is_disabled (editorial kill-switch)
 *      scheduled ← starts_at > now()
 *      expired   ← expires_at <= now()
 *      active    ← otherwise
 */

/* ── shared column helpers ────────────────────────────────────────────────── */

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow();

/** Postgres `tsvector`, used for the generated full-text search column. */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

/* ── merchants ────────────────────────────────────────────────────────────── */

export const merchants = pgTable(
  "merchants",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Store homepage. Every outbound link must resolve against this host. */
    websiteUrl: text("website_url").notNull(),
    /** Optional affiliate-tagged base URL. Null ⇒ plain destination link. */
    affiliateUrl: text("affiliate_url"),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    /** Optional remote logo. When null the UI renders a deterministic wordmark. */
    logoUrl: text("logo_url"),
    /** Drives the wordmark tint when no logo is supplied. */
    brandColor: text("brand_color"),
    country: text("country").notNull().default("Global"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("merchants_slug_key").on(t.slug),
    index("merchants_featured_idx").on(t.isFeatured, t.name),
    // Powers merchant autocomplete (prefix scan): lower(name) LIKE 'foo%'
    index("merchants_name_prefix_idx").on(sql`lower(${t.name})`),
  ],
);

/* ── categories ───────────────────────────────────────────────────────────── */

export const categories = pgTable(
  "categories",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    /** Lucide icon name; the UI owns the mapping. */
    icon: text("icon").notNull().default("Tag"),
    /** Accent token used by the category visual system. */
    accent: text("accent").notNull().default("brand"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("categories_slug_key").on(t.slug),
    index("categories_sort_idx").on(t.sortOrder, t.name),
    index("categories_name_prefix_idx").on(sql`lower(${t.name})`),
  ],
);

/* ── coupons ──────────────────────────────────────────────────────────────── */

export const coupons = pgTable(
  "coupons",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    merchantId: integer("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    /** Restrictions shown next to the code so users understand the deal. */
    terms: text("terms"),

    /** 'code' ⇒ user must enter a code. 'deal' ⇒ auto-applied at destination. */
    kind: text("kind").notNull().default("code"),
    /** Null for deals / free shipping that carry no code. */
    code: text("code"),
    /** 'percent' | 'fixed' | 'shipping' | 'bogo' | 'other' */
    discountType: text("discount_type").notNull().default("percent"),
    /** 20 = 20% off for 'percent'; 15.00 = $15 off for 'fixed'. Null otherwise. */
    discountValue: numeric("discount_value", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("USD"),

    destinationUrl: text("destination_url").notNull(),
    /** Optional artwork. Null ⇒ hero falls back to the merchant wordmark. */
    imageUrl: text("image_url"),

    /** Null ⇒ no start boundary (live immediately). */
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
    /** Null ⇒ no end boundary (ongoing offer). */
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),

    /** Editorial kill-switch. Status itself is derived (see file header). */
    isDisabled: boolean("is_disabled").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }),
    isFeatured: boolean("is_featured").notNull().default(false),
    isExclusive: boolean("is_exclusive").notNull().default(false),

    /* Popularity CACHE — aggregates of `events`, see file header. */
    viewCount: integer("view_count").notNull().default(0),
    copyCount: integer("copy_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),

    /* Search index CACHE — maintained on write. */
    searchDocument: text("search_document").notNull().default(""),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, coalesce("search_document", ''))`,
    ),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("coupons_slug_key").on(t.slug),

    // Listing / filtering
    index("coupons_merchant_created_idx").on(t.merchantId, t.createdAt),
    index("coupons_created_idx").on(t.createdAt),
    index("coupons_expires_idx").on(t.expiresAt),
    index("coupons_starts_idx").on(t.startsAt),
    index("coupons_disabled_idx").on(t.isDisabled),
    index("coupons_featured_idx").on(t.isFeatured, t.createdAt),
    index("coupons_verified_idx").on(t.isVerified),
    // Sorting by popularity
    index("coupons_click_count_idx").on(t.clickCount),
    index("coupons_copy_count_idx").on(t.copyCount),
    // "High value" ordering: biggest percentage first
    index("coupons_value_idx").on(t.discountType, t.discountValue),

    uniqueIndex("coupons_merchant_code_key").on(t.merchantId, t.code),
    index("coupons_search_idx").using("gin", t.searchVector),

    check("coupons_kind_check", sql`${t.kind} in ('code', 'deal')`),
    check(
      "coupons_discount_type_check",
      sql`${t.discountType} in ('percent', 'fixed', 'shipping', 'bogo', 'other')`,
    ),
    check(
      "coupons_discount_value_check",
      sql`${t.discountValue} is null or ${t.discountValue} >= 0`,
    ),
    check(
      "coupons_code_present_check",
      sql`(${t.kind} = 'deal') or (${t.code} is not null and length(btrim(${t.code})) > 0)`,
    ),
    check(
      "coupons_date_order_check",
      sql`${t.startsAt} is null or ${t.expiresAt} is null or ${t.startsAt} < ${t.expiresAt}`,
    ),
  ],
);

/* ── coupon ↔ categories (many-to-many) ───────────────────────────────────── */

export const couponCategories = pgTable(
  "coupon_categories",
  {
    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.couponId, t.categoryId] }),
    index("coupon_categories_category_idx").on(t.categoryId),
  ],
);

/* ── events (append-only interaction log) ─────────────────────────────────── */

export const EVENT_TYPES = [
  "view",
  "copy",
  "click",
  "search",
  "merchant_view",
  "category_view",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const couponEvents = pgTable(
  "coupon_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: text("type").notNull(),
    /** Null for site-wide events such as `search`. */
    couponId: integer("coupon_id").references(() => coupons.id, {
      onDelete: "cascade",
    }),
    merchantId: integer("merchant_id").references(() => merchants.id, {
      onDelete: "set null",
    }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    /** Salted SHA-256 of the anonymous visitor cookie. Never a raw identifier. */
    visitorId: text("visitor_id").notNull(),
    /** date_trunc('hour', created_at) — enables cheap de-duplication. */
    hourBucket: timestamp("hour_bucket", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`date_trunc('hour', now())`),
    /** Small, non-sensitive context, e.g. { q: "nike" } for search events. */
    payload: jsonb("payload").$type<Record<string, string | number | boolean>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("coupon_events_coupon_type_time_idx").on(t.couponId, t.type, t.createdAt),
    index("coupon_events_type_time_idx").on(t.type, t.createdAt),
    index("coupon_events_merchant_time_idx").on(t.merchantId, t.createdAt),
    // De-duplication: one counted interaction per coupon/visitor/type/hour.
    // Keeps a double-click or an over-eager client from inflating the numbers.
    uniqueIndex("coupon_events_dedupe_idx").on(
      t.couponId,
      t.visitorId,
      t.type,
      t.hourBucket,
    ),
    check(
      "coupon_events_type_check",
      sql`${t.type} in ('view', 'copy', 'click', 'search', 'merchant_view', 'category_view')`,
    ),
  ],
);

/* ── inferred types ───────────────────────────────────────────────────────── */

export type Merchant = typeof merchants.$inferSelect;
export type NewMerchant = typeof merchants.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponEvent = typeof couponEvents.$inferSelect;
export type NewCouponEvent = typeof couponEvents.$inferInsert;
