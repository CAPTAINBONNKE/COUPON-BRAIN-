import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { deriveStatus, type CouponStatus } from "@/lib/coupon";
import { parseDealQuery, type DealQuery, type RawSearchParams } from "@/lib/validation";

import { couponEndingWithinSql, couponIsLiveSql } from "./coupon-status";
import { getDb } from "./client";
import {
  categories,
  couponCategories,
  couponEvents,
  coupons,
  merchants,
} from "./schema";

/* ═══════════════════════════════════════════════════════════════════════════
   DOMAIN TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type MerchantSummary = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  websiteUrl: string;
  tagline: string;
  country: string;
};

export type CategorySummary = {
  id: number;
  name: string;
  slug: string;
  icon: string;
  accent: string;
  description: string;
};

export type CouponCard = {
  id: number;
  slug: string;
  title: string;
  description: string;
  terms: string | null;
  kind: string;
  code: string | null;
  discountType: string;
  discountValue: number | null;
  currency: string;
  destinationUrl: string;
  imageUrl: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  isFeatured: boolean;
  isExclusive: boolean;
  viewCount: number;
  copyCount: number;
  clickCount: number;
  createdAt: Date;
  /** Derived server-side — never read from the client's clock. */
  status: CouponStatus;
  merchant: MerchantSummary;
  categories: CategorySummary[];
};

export type DealListResult = {
  items: CouponCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  query: DealQuery;
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Escape LIKE wildcards so user input cannot change the shape of a pattern. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Postgres can infer `numeric >= $1`, but be explicit to avoid text comparison. */
function numericAtLeast(column: SQL, value: number): SQL {
  return sql`${column} >= ${value}::numeric`;
}

const couponColumns = {
  id: coupons.id,
  slug: coupons.slug,
  title: coupons.title,
  description: coupons.description,
  terms: coupons.terms,
  kind: coupons.kind,
  code: coupons.code,
  discountType: coupons.discountType,
  discountValue: coupons.discountValue,
  currency: coupons.currency,
  destinationUrl: coupons.destinationUrl,
  imageUrl: coupons.imageUrl,
  startsAt: coupons.startsAt,
  expiresAt: coupons.expiresAt,
  isVerified: coupons.isVerified,
  verifiedAt: coupons.verifiedAt,
  isFeatured: coupons.isFeatured,
  isExclusive: coupons.isExclusive,
  viewCount: coupons.viewCount,
  copyCount: coupons.copyCount,
  clickCount: coupons.clickCount,
  createdAt: coupons.createdAt,
  isDisabled: coupons.isDisabled,
  merchantId: coupons.merchantId,
};

const merchantColumns = {
  id: merchants.id,
  name: merchants.name,
  slug: merchants.slug,
  logoUrl: merchants.logoUrl,
  brandColor: merchants.brandColor,
  websiteUrl: merchants.websiteUrl,
  tagline: merchants.tagline,
  country: merchants.country,
};

const categoryColumns = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  icon: categories.icon,
  accent: categories.accent,
  description: categories.description,
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Shared "live offer" predicate, used by every public query. */
const liveOnly = (): SQL => sql`${coupons.isDisabled} = false and ${couponIsLiveSql}`;

/**
 * Live-offer counts per merchant and per category.
 *
 * NOTE: these are deliberately LEFT JOIN + GROUP BY rather than correlated
 * sub-selects. Drizzle renders `${table.column}` as a bare `"column"` inside a
 * select-list subquery, which silently binds to the wrong table; a join makes
 * the qualification explicit and is easier for the planner to index.
 */
type CountQueryOptions = {
  where?: SQL;
  orderBy?: SQL[];
  limit?: number;
  /** Drop rows with no live offers (keeps discovery pages from looking empty). */
  onlyWithOffers?: boolean;
};

async function selectMerchantCounts(options: CountQueryOptions = {}): Promise<MerchantWithCount[]> {
  const db = await getDb();
  const query = db
    .select({ ...merchantColumns, couponCount: sql<number>`count(${coupons.id})` })
    .from(merchants)
    .leftJoin(coupons, and(eq(coupons.merchantId, merchants.id), liveOnly()))
    .where(options.where)
    .groupBy(merchants.id);

  if (options.orderBy?.length) query.orderBy(...options.orderBy);
  if (options.limit) query.limit(options.limit);

  const rows = (await query).map((row) => ({
    ...row,
    couponCount: Number(row.couponCount ?? 0),
  }));

  return options.onlyWithOffers ? rows.filter((row) => row.couponCount > 0) : rows;
}

async function selectCategoryCounts(options: CountQueryOptions = {}): Promise<CategoryWithCount[]> {
  const db = await getDb();
  const query = db
    .select({ ...categoryColumns, couponCount: sql<number>`count(${coupons.id})` })
    .from(categories)
    .leftJoin(couponCategories, eq(couponCategories.categoryId, categories.id))
    .leftJoin(coupons, and(eq(coupons.id, couponCategories.couponId), liveOnly()))
    .where(options.where)
    .groupBy(categories.id);

  if (options.orderBy?.length) query.orderBy(...options.orderBy);
  if (options.limit) query.limit(options.limit);

  const rows = (await query).map((row) => ({
    ...row,
    couponCount: Number(row.couponCount ?? 0),
  }));

  return options.onlyWithOffers ? rows.filter((row) => row.couponCount > 0) : rows;
}

/**
 * Hydrate a set of coupon ids into fully-populated cards in ONE round trip
 * (coupons+merchants, then all their categories). Callers rank by id order,
 * so several homepage sections can share a single hydration query.
 */
async function hydrateCoupons(ids: number[]): Promise<CouponCard[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const uniqueIds = Array.from(new Set(ids));

  const [rows, categoryRows] = await Promise.all([
    db
      .select({ coupon: couponColumns, merchant: merchantColumns })
      .from(coupons)
      .innerJoin(merchants, eq(coupons.merchantId, merchants.id))
      .where(inArray(coupons.id, uniqueIds)),
    db
      .select({ couponId: couponCategories.couponId, category: categoryColumns })
      .from(couponCategories)
      .innerJoin(categories, eq(categories.id, couponCategories.categoryId))
      .where(inArray(couponCategories.couponId, uniqueIds))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  const categoriesByCoupon = new Map<number, CategorySummary[]>();
  for (const row of categoryRows) {
    const list = categoriesByCoupon.get(row.couponId) ?? [];
    list.push(row.category);
    categoriesByCoupon.set(row.couponId, list);
  }

  const now = new Date();
  const byId = new Map<number, CouponCard>();

  for (const row of rows) {
    const coupon = row.coupon;
    byId.set(coupon.id, {
      id: coupon.id,
      slug: coupon.slug,
      title: coupon.title,
      description: coupon.description,
      terms: coupon.terms,
      kind: coupon.kind,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: toNumber(coupon.discountValue),
      currency: coupon.currency,
      destinationUrl: coupon.destinationUrl,
      imageUrl: coupon.imageUrl,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      isVerified: coupon.isVerified,
      verifiedAt: coupon.verifiedAt,
      isFeatured: coupon.isFeatured,
      isExclusive: coupon.isExclusive,
      viewCount: coupon.viewCount,
      copyCount: coupon.copyCount,
      clickCount: coupon.clickCount,
      createdAt: coupon.createdAt,
      status: deriveStatus(
        { isDisabled: coupon.isDisabled, startsAt: coupon.startsAt, expiresAt: coupon.expiresAt },
        now,
      ),
      merchant: row.merchant,
      categories: categoriesByCoupon.get(coupon.id) ?? [],
    });
  }

  return ids
    .map((id) => byId.get(id))
    .filter((item): item is CouponCard => item !== undefined);
}

/** Ids only, so several sections can be merged into one hydration. */
async function fetchIds(where: SQL | undefined, orderBy: SQL[], limit: number): Promise<number[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(where)
    .orderBy(...orderBy)
    .limit(limit);
  return rows.map((row) => row.id);
}

/** Handles both driver shapes (postgres.js RowList vs PGlite result object). */
function normaliseRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const maybe = result as { rows?: T[] };
  return maybe?.rows ?? [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH / BROWSE — the canonical listing (search + filters + sort + paging)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildDealConditions(query: DealQuery): { conditions: SQL[]; tsQuery: SQL | null } {
  const conditions: SQL[] = [sql`${coupons.isDisabled} = false`];

  // Status is derived from dates in the database, never stored or trusted from
  // the client.
  if (query.status === "active") {
    conditions.push(couponIsLiveSql);
  } else if (query.status === "expired") {
    conditions.push(sql`(${coupons.expiresAt} is not null and ${coupons.expiresAt} <= now())`);
  }

  if (query.merchant) {
    conditions.push(
      sql`exists (select 1 from ${merchants} m where m.id = ${coupons.merchantId} and m.slug = ${query.merchant})`,
    );
  }

  if (query.category) {
    conditions.push(
      sql`exists (
            select 1 from ${couponCategories} cc
            join ${categories} cat on cat.id = cc.category_id
            where cc.coupon_id = ${coupons.id} and cat.slug = ${query.category}
          )`,
    );
  }

  if (query.type) conditions.push(eq(coupons.kind, query.type));
  if (query.verified) conditions.push(eq(coupons.isVerified, true));

  if (query.minDiscount !== undefined) {
    conditions.push(and(eq(coupons.discountType, "percent"), numericAtLeast(sql`${coupons.discountValue}`, query.minDiscount))!);
  }

  let tsQuery: SQL | null = null;
  const term = query.q?.trim();

  if (term) {
    // websearch_to_tsquery is designed for raw user input and never errors.
    tsQuery = sql`websearch_to_tsquery('english', ${term})`;
    const fts = sql`${coupons.searchVector} @@ ${tsQuery}`;

    // Short terms are usually promo codes ("SAVE20") or prefixes ("nik"), where
    // stemming and lexeme matching fall short. Substring matching is enabled
    // only for those, keeping ordinary word search fully indexed.
    const isCodeLike = term.length <= 5 || /^[a-z0-9]+$/i.test(term);

    conditions.push(
      isCodeLike
        ? sql`(${fts} or ${coupons.title} ilike ${`%${escapeLike(term)}%`} or (${coupons.code} is not null and ${coupons.code} ilike ${`%${escapeLike(term)}%`}))`
        : fts,
    );
  }

  return { conditions, tsQuery };
}

function buildDealOrder(query: DealQuery, tsQuery: SQL | null): SQL[] {
  const tieBreak = asc(coupons.id);

  switch (query.sort) {
    case "newest":
      return [desc(coupons.createdAt), tieBreak];
    case "ending":
      return [sql`${coupons.expiresAt} asc nulls last`, desc(coupons.clickCount), tieBreak];
    case "discount":
      return [sql`${coupons.discountValue} desc nulls last`, desc(coupons.clickCount), tieBreak];
    case "popular":
      return [desc(coupons.clickCount), desc(coupons.copyCount), desc(coupons.createdAt), tieBreak];
    case "relevance":
    default:
      if (tsQuery) {
        return [
          sql`ts_rank_cd(${coupons.searchVector}, ${tsQuery}) desc`,
          desc(coupons.clickCount),
          tieBreak,
        ];
      }
      return [desc(coupons.clickCount), desc(coupons.copyCount), desc(coupons.createdAt), tieBreak];
  }
}

export async function searchDeals(params: RawSearchParams): Promise<DealListResult> {
  const query = parseDealQuery(params);
  const { conditions, tsQuery } = buildDealConditions(query);
  const where = and(...conditions);

  const db = await getDb();
  const offset = (query.page - 1) * query.perPage;

  const [idRows, totalRows] = await Promise.all([
    db
      .select({ id: coupons.id })
      .from(coupons)
      .where(where)
      .orderBy(...buildDealOrder(query, tsQuery))
      .limit(query.perPage)
      .offset(offset),
    db.select({ value: count() }).from(coupons).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;
  const items = await hydrateCoupons(idRows.map((row) => row.id));

  return {
    items,
    total,
    page: query.page,
    perPage: query.perPage,
    totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    query,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOMEPAGE SECTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Trending = most clicked in the last 14 days, measured on `events` (the source
 * of truth) rather than the all-time counter cache. Written as raw SQL because
 * Drizzle cannot express an aggregate-left-join ranking cleanly; every value is
 * a bound parameter.
 */
const trendingIdsSql = (limit: number) => sql`
  select c.id
  from ${coupons} c
  left join ${couponEvents} e
    on e.coupon_id = c.id
   and e.type = 'click'
   and e.created_at > now() - interval '14 days'
  where c.is_disabled = false
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at > now())
  group by c.id
  order by count(e.id) desc, c.click_count desc, c.id asc
  limit ${limit}
`;

export type PlatformStats = {
  liveCoupons: number;
  merchants: number;
  categories: number;
  verifiedCoupons: number;
  biggestPercent: number | null;
};

export type HomeSections = {
  featured: CouponCard[];
  trending: CouponCard[];
  endingSoon: CouponCard[];
  highValue: CouponCard[];
  recent: CouponCard[];
  stats: PlatformStats;
};

export async function getHomeSections(): Promise<HomeSections> {
  const db = await getDb();

  const [featuredIds, endingSoonIds, highValueIds, recentIds] = await Promise.all([
    fetchIds(
      and(liveOnly(), eq(coupons.isFeatured, true))!,
      [desc(coupons.clickCount), desc(coupons.createdAt)],
      6,
    ),
    fetchIds(
      and(liveOnly(), couponEndingWithinSql(72))!,
      [sql`${coupons.expiresAt} asc`, desc(coupons.clickCount)],
      6,
    ),
    fetchIds(
      and(liveOnly(), eq(coupons.discountType, "percent"), numericAtLeast(sql`${coupons.discountValue}`, 40))!,
      [sql`${coupons.discountValue} desc nulls last`, desc(coupons.clickCount)],
      6,
    ),
    fetchIds(liveOnly(), [desc(coupons.createdAt)], 6),
  ]);

  const trendingRows = normaliseRows<{ id: number | string }>(
    await db.execute(trendingIdsSql(6)),
  );
  const trendingIds = trendingRows.map((row) => Number(row.id)).filter(Number.isInteger);

  const cards = await hydrateCoupons([
    ...featuredIds,
    ...trendingIds,
    ...endingSoonIds,
    ...highValueIds,
    ...recentIds,
  ]);

  const byId = new Map(cards.map((card) => [card.id, card]));
  const pick = (ids: number[]) =>
    ids.map((id) => byId.get(id)).filter((item): item is CouponCard => item !== undefined);

  const stats = await getPlatformStats();

  return {
    featured: pick(featuredIds),
    trending: pick(trendingIds),
    endingSoon: pick(endingSoonIds),
    highValue: pick(highValueIds),
    recent: pick(recentIds),
    stats,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATS
   ═══════════════════════════════════════════════════════════════════════════ */

export async function getPlatformStats(): Promise<PlatformStats> {
  const db = await getDb();

  const [couponRow, merchantRow, categoryRow, verifiedRow, biggestRow] = await Promise.all([
    db.select({ value: count() }).from(coupons).where(liveOnly()),
    db.select({ value: count() }).from(merchants).where(eq(merchants.isActive, true)),
    db.select({ value: count() }).from(categories).where(eq(categories.isActive, true)),
    db.select({ value: count() }).from(coupons).where(and(liveOnly(), eq(coupons.isVerified, true))!),
    db
      .select({ value: sql<number>`max(${coupons.discountValue})` })
      .from(coupons)
      .where(and(liveOnly(), eq(coupons.discountType, "percent"))!),
  ]);

  return {
    liveCoupons: couponRow[0]?.value ?? 0,
    merchants: merchantRow[0]?.value ?? 0,
    categories: categoryRow[0]?.value ?? 0,
    verifiedCoupons: verifiedRow[0]?.value ?? 0,
    biggestPercent: toNumber(biggestRow[0]?.value ?? null),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════════════════════════════════════ */

export type CategoryWithCount = CategorySummary & { couponCount: number };

export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  return selectCategoryCounts({
    where: eq(categories.isActive, true),
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
    onlyWithOffers: true,
  });
}

export async function getCategoryBySlug(slug: string): Promise<CategorySummary | null> {
  const db = await getDb();
  const rows = await db.select(categoryColumns).from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getRelatedCategories(
  excludeId: number,
  limit = 6,
): Promise<CategoryWithCount[]> {
  const all = await getCategoriesWithCounts();
  return all.filter((category) => category.id !== excludeId).slice(0, limit);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MERCHANTS
   ═══════════════════════════════════════════════════════════════════════════ */

export type MerchantWithCount = MerchantSummary & { couponCount: number };

export async function getMerchantsWithCounts(limit = 60): Promise<MerchantWithCount[]> {
  const rows = await selectMerchantCounts({
    where: eq(merchants.isActive, true),
    orderBy: [asc(merchants.name)],
    limit,
  });

  return rows.sort((a, b) => b.couponCount - a.couponCount || a.name.localeCompare(b.name));
}

export type MerchantDetail = MerchantSummary & {
  description: string;
  affiliateUrl: string | null;
  isFeatured: boolean;
};

export async function getMerchantBySlug(slug: string): Promise<MerchantDetail | null> {
  const db = await getDb();
  const rows = await db
    .select({
      ...merchantColumns,
      description: merchants.description,
      affiliateUrl: merchants.affiliateUrl,
      isFeatured: merchants.isFeatured,
    })
    .from(merchants)
    .where(eq(merchants.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFeaturedMerchants(limit = 12): Promise<MerchantWithCount[]> {
  return selectMerchantCounts({
    where: and(eq(merchants.isActive, true), eq(merchants.isFeatured, true))!,
    orderBy: [asc(merchants.name)],
    limit,
    onlyWithOffers: true,
  });
}

/** The merchant a free-text query most likely refers to (powers the match banner). */
export async function getMerchantForQuery(term: string): Promise<MerchantSummary | null> {
  const db = await getDb();
  const rows = await db
    .select(merchantColumns)
    .from(merchants)
    .where(and(eq(merchants.isActive, true), sql`lower(${merchants.name}) = lower(${term})`)!)
    .limit(1);
  return rows[0] ?? null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLE COUPON
   ═══════════════════════════════════════════════════════════════════════════ */

export async function getCouponBySlug(slug: string): Promise<CouponCard | null> {
  const db = await getDb();
  const rows = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.slug, slug)).limit(1);

  const id = rows[0]?.id;
  if (id === undefined) return null;

  const [card] = await hydrateCoupons([id]);
  return card ?? null;
}

/** Bulk lookup by slug — used by /saved to re-hydrate a device-side list. */
export async function getCouponsBySlugs(slugs: string[]): Promise<CouponCard[]> {
  if (slugs.length === 0) return [];
  const db = await getDb();

  const rows = await db
    .select({ id: coupons.id, slug: coupons.slug })
    .from(coupons)
    .where(inArray(coupons.slug, slugs));

  const cards = await hydrateCoupons(rows.map((row) => row.id));
  const order = new Map(slugs.map((slug, index) => [slug, index]));

  // Preserve the order the client asked for, and drop anything since deleted.
  return cards.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export async function getRelatedCoupons(
  coupon: { id: number; merchantId: number; categoryIds: number[] },
  limit = 6,
): Promise<CouponCard[]> {
  const db = await getDb();

  const ids = coupon.categoryIds.filter((id) => Number.isInteger(id));
  const categoryMatch =
    ids.length > 0
      ? sql`exists (
            select 1 from ${couponCategories} cc
            where cc.coupon_id = ${coupons.id}
              and cc.category_id in (${sql.join(
                ids.map((id) => sql`${id}::int`),
                sql`, `,
              )})
          )`
      : sql`false`;

  const rows = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(
      and(
        liveOnly(),
        sql`${coupons.id} <> ${coupon.id}`,
        sql`(${coupons.merchantId} = ${coupon.merchantId} or ${categoryMatch})`,
      )!,
    )
    .orderBy(
      sql`case when ${coupons.merchantId} = ${coupon.merchantId} then 0 else 1 end`,
      desc(coupons.clickCount),
    )
    .limit(limit);

  return hydrateCoupons(rows.map((row) => row.id));
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUGGEST (autocomplete)
   ═══════════════════════════════════════════════════════════════════════════ */

export type SuggestionResult = {
  merchants: MerchantWithCount[];
  categories: CategoryWithCount[];
  coupons: { slug: string; title: string; merchantName: string }[];
};

export async function getSuggestions(term: string, limit = 6): Promise<SuggestionResult> {
  const db = await getDb();
  const prefix = `${escapeLike(term.toLowerCase())}%`;

  const [merchantRows, categoryRows, couponRows] = await Promise.all([
    selectMerchantCounts({
      where: and(eq(merchants.isActive, true), sql`lower(${merchants.name}) like ${prefix}`)!,
      orderBy: [asc(merchants.name)],
      limit,
      onlyWithOffers: true,
    }),
    selectCategoryCounts({
      where: and(eq(categories.isActive, true), sql`lower(${categories.name}) like ${prefix}`)!,
      orderBy: [asc(categories.name)],
      limit,
      onlyWithOffers: true,
    }),
    db
      .select({ slug: coupons.slug, title: coupons.title, merchantName: merchants.name })
      .from(coupons)
      .innerJoin(merchants, eq(coupons.merchantId, merchants.id))
      .where(and(liveOnly(), sql`${coupons.searchVector} @@ plainto_tsquery('english', ${term})`)!)
      .orderBy(desc(coupons.clickCount))
      .limit(limit),
  ]);

  return { merchants: merchantRows, categories: categoryRows, coupons: couponRows };
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER FACETS — every count shown in the filter panel comes from the DB
   ═══════════════════════════════════════════════════════════════════════════ */

export type DealFacets = {
  categories: { slug: string; name: string; count: number }[];
  merchants: { slug: string; name: string; count: number }[];
  codeCount: number;
  dealCount: number;
  verifiedCount: number;
};

export async function getDealFacets(): Promise<DealFacets> {
  const db = await getDb();

  const [categoryRows, merchantRows, typeRows] = await Promise.all([
    db
      .select({ slug: categories.slug, name: categories.name, count: sql<number>`count(${coupons.id})` })
      .from(categories)
      .innerJoin(couponCategories, eq(couponCategories.categoryId, categories.id))
      .innerJoin(coupons, eq(coupons.id, couponCategories.couponId))
      .where(and(eq(categories.isActive, true), liveOnly())!)
      .groupBy(categories.id, categories.slug, categories.name, categories.sortOrder)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ slug: merchants.slug, name: merchants.name, count: sql<number>`count(${coupons.id})` })
      .from(merchants)
      .innerJoin(coupons, eq(coupons.merchantId, merchants.id))
      .where(and(eq(merchants.isActive, true), liveOnly())!)
      .groupBy(merchants.id, merchants.slug, merchants.name)
      .orderBy(sql`count(${coupons.id}) desc`, asc(merchants.name))
      .limit(40),
    db
      .select({ kind: coupons.kind, isVerified: coupons.isVerified, count: sql<number>`count(*)` })
      .from(coupons)
      .where(liveOnly())
      .groupBy(coupons.kind, coupons.isVerified),
  ]);

  let codeCount = 0;
  let dealCount = 0;
  let verifiedCount = 0;
  for (const row of typeRows) {
    const value = Number(row.count ?? 0);
    if (row.kind === "code") codeCount += value;
    else dealCount += value;
    if (row.isVerified) verifiedCount += value;
  }

  return {
    categories: categoryRows.map((row) => ({ ...row, count: Number(row.count ?? 0) })),
    merchants: merchantRows.map((row) => ({ ...row, count: Number(row.count ?? 0) })),
    codeCount,
    dealCount,
    verifiedCount,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLLECTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

export async function getEndingSoon(limit = 24): Promise<DealListResult> {
  const ids = await fetchIds(
    and(liveOnly(), couponEndingWithinSql(168))!,
    [sql`${coupons.expiresAt} asc`, desc(coupons.clickCount)],
    limit,
  );
  const items = await hydrateCoupons(ids);

  return {
    items,
    total: items.length,
    page: 1,
    perPage: limit,
    totalPages: 1,
    query: parseDealQuery({ sort: "ending" }),
  };
}

export async function getCategoryDeals(slug: string, params: RawSearchParams): Promise<DealListResult> {
  return searchDeals({ ...params, category: slug });
}

export async function getMerchantDeals(slug: string, params: RawSearchParams): Promise<DealListResult> {
  return searchDeals({ ...params, merchant: slug });
}

/** Categories a merchant actually has live offers in. */
export async function getCategoriesForMerchant(merchantId: number): Promise<CategoryWithCount[]> {
  const db = await getDb();

  const rows = await db
    .select({ ...categoryColumns, couponCount: sql<number>`count(${coupons.id})` })
    .from(coupons)
    .innerJoin(couponCategories, eq(couponCategories.couponId, coupons.id))
    .innerJoin(categories, eq(categories.id, couponCategories.categoryId))
    .where(and(eq(coupons.merchantId, merchantId), liveOnly())!)
    .groupBy(categories.id, categories.name, categories.slug, categories.icon, categories.accent, categories.description)
    .orderBy(sql`count(${coupons.id}) desc`, asc(categories.name));

  return rows.map((row) => ({ ...row, couponCount: Number(row.couponCount ?? 0) }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUPPORT: sitemap, /go redirect, recount script
   ═══════════════════════════════════════════════════════════════════════════ */

export async function getSitemapEntries() {
  const db = await getDb();

  const [couponRows, merchantRows, categoryRows] = await Promise.all([
    db
      .select({ slug: coupons.slug, updatedAt: coupons.updatedAt })
      .from(coupons)
      .where(liveOnly())
      .orderBy(desc(coupons.updatedAt))
      .limit(5_000),
    db
      .select({ slug: merchants.slug, updatedAt: merchants.updatedAt })
      .from(merchants)
      .where(eq(merchants.isActive, true))
      .limit(2_000),
    db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.isActive, true))
      .limit(500),
  ]);

  return { coupons: couponRows, merchants: merchantRows, categories: categoryRows };
}

export async function getCouponDestination(
  slug: string,
): Promise<{ id: number; url: string; merchantId: number; status: CouponStatus } | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: coupons.id,
      url: coupons.destinationUrl,
      merchantId: coupons.merchantId,
      isDisabled: coupons.isDisabled,
      startsAt: coupons.startsAt,
      expiresAt: coupons.expiresAt,
    })
    .from(coupons)
    .where(eq(coupons.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return { id: row.id, url: row.url, merchantId: row.merchantId, status: deriveStatus(row) };
}

/** Used by scripts/recount.ts to rebuild the counter cache from `events`. */
export async function getCouponTotals() {
  const db = await getDb();
  return db.select({ id: coupons.id }).from(coupons);
}
