import "./load-env";

import { sql } from "drizzle-orm";

import { scheduledOffers, seedCategories, seedMerchants, type SeedOffer } from "../src/db/seed-data";
import { slugify } from "../src/lib/utils";

const DAY = 24 * 60 * 60 * 1000;

/** Deterministic PRNG so repeated seeds produce a stable demo dataset. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261020);

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY);
}

function startOfHour(date: Date): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function randomVisitorId(): string {
  return Array.from({ length: 16 }, () =>
    "0123456789abcdef".charAt(Math.floor(random() * 16)),
  ).join("");
}

function buildSearchDocument(
  title: string,
  merchantName: string,
  categoryNames: string[],
  code: string | null,
): string {
  return [title, merchantName, categoryNames.join(" "), code ?? ""].join(" ").toLowerCase();
}

async function main() {
  const { closeDb, getDb, usingSupabase } = await import("../src/db/client");
  const { categories, couponCategories, couponEvents, coupons, merchants } = await import(
    "../src/db/schema"
  );

  const db = await getDb();
  console.log(`→ seeding ${usingSupabase() ? "Supabase" : "local embedded Postgres"}`);

  /* ── categories ────────────────────────────────────────────────────────── */
  const categoryRows = await db
    .insert(categories)
    .values(
      seedCategories.map((category) => ({
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        accent: category.accent,
        sortOrder: category.sortOrder,
        isActive: true,
      })),
    )
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        icon: sql`excluded.icon`,
        accent: sql`excluded.accent`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: categories.id, slug: categories.slug, name: categories.name });

  const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row]));
  console.log(`✓ ${categoryBySlug.size} categories`);

  /* ── merchants ─────────────────────────────────────────────────────────── */
  const merchantRows = await db
    .insert(merchants)
    .values(
      seedMerchants.map((merchant) => ({
        name: merchant.name,
        slug: merchant.slug,
        websiteUrl: merchant.websiteUrl,
        tagline: merchant.tagline,
        description: merchant.description,
        brandColor: merchant.brandColor,
        country: merchant.country,
        isFeatured: merchant.featured ?? false,
        isActive: true,
      })),
    )
    .onConflictDoUpdate({
      target: merchants.slug,
      set: {
        name: sql`excluded.name`,
        websiteUrl: sql`excluded.website_url`,
        tagline: sql`excluded.tagline`,
        description: sql`excluded.description`,
        brandColor: sql`excluded.brand_color`,
        country: sql`excluded.country`,
        isFeatured: sql`excluded.is_featured`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: merchants.id, slug: merchants.slug, name: merchants.name });

  const merchantBySlug = new Map(merchantRows.map((row) => [row.slug, row]));
  console.log(`✓ ${merchantBySlug.size} merchants`);

  /* ── coupons ───────────────────────────────────────────────────────────── */
  const now = new Date();
  const usedSlugs = new Set<string>();
  type CouponSeed = {
    row: typeof coupons.$inferInsert;
    merchantSlug: string;
    categorySlugs: string[];
  };
  const couponSeeds: CouponSeed[] = [];

  const offersByMerchant = new Map<string, SeedOffer[]>();
  for (const merchant of seedMerchants) offersByMerchant.set(merchant.slug, merchant.offers);
  for (const { merchantSlug, offer } of scheduledOffers) {
    const list = offersByMerchant.get(merchantSlug) ?? [];
    list.push(offer);
    offersByMerchant.set(merchantSlug, list);
  }

  for (const merchant of seedMerchants) {
    const merchantRow = merchantBySlug.get(merchant.slug);
    if (!merchantRow) continue;

    for (const offer of offersByMerchant.get(merchant.slug) ?? []) {
      const code = offer.code ?? null;
      const kind = offer.kind ?? (code ? "code" : "deal");

      let expiresAt: Date | null = null;
      if (offer.expiresInDays !== undefined && offer.expiresInDays !== null) {
        expiresAt = addDays(now, offer.expiresInDays);
      }

      let startsAt: Date | null = null;

      if (offer.startsInDays !== undefined) {
        // Explicitly scheduled: goes live in the future.
        startsAt = addDays(now, offer.startsInDays);
      } else if (expiresAt && expiresAt.getTime() <= now.getTime()) {
        // Already expired: give it a plausible history so the sample dataset
        // exercises the expired state properly.
        startsAt = addDays(expiresAt, -30);
      }
      // Otherwise: no start boundary at all → live immediately.

      let baseSlug = slugify(`${merchant.slug} ${offer.title}`);
      let slug = baseSlug;
      let counter = 2;
      while (usedSlugs.has(slug)) slug = `${baseSlug}-${counter++}`;
      usedSlugs.add(slug);

      const categorySlugs = offer.categories.filter((slug) => categoryBySlug.has(slug));
      const categoryNames = categorySlugs.map((slug) => categoryBySlug.get(slug)?.name ?? "");

      couponSeeds.push({
        merchantSlug: merchant.slug,
        categorySlugs,
        row: {
          merchantId: merchantRow.id,
          title: offer.title,
          slug,
          description: `${offer.title} at ${merchant.name}.${merchant.tagline ? ` ${merchant.tagline}.` : ""}`,
          terms: offer.terms ?? null,
          kind,
          code: kind === "code" ? code : null,
          discountType: offer.discountType,
          discountValue: offer.discountValue != null ? String(offer.discountValue) : null,
          currency: merchant.slug === "jumia" || merchant.slug === "safari-com" ? "KES" : "USD",
          destinationUrl: offer.path
            ? `${merchant.websiteUrl.replace(/\/$/, "")}${offer.path}`
            : merchant.websiteUrl,
          startsAt,
          expiresAt,
          isDisabled: false,
          isVerified: offer.verified ?? false,
          verifiedAt: offer.verified ? now : null,
          isFeatured: offer.featured ?? false,
          isExclusive: offer.exclusive ?? false,
          searchDocument: buildSearchDocument(offer.title, merchant.name, categoryNames, code),
          createdAt: addDays(now, -Math.floor(random() * 45)),
        },
      });
    }
  }

  console.log(`→ inserting ${couponSeeds.length} coupons`);

  const insertedCoupons: { id: number; merchantSlug: string; categorySlugs: string[]; featured: boolean }[] = [];

  const CHUNK = 100;
  for (let i = 0; i < couponSeeds.length; i += CHUNK) {
    const chunk = couponSeeds.slice(i, i + CHUNK);
    const rows = await db
      .insert(coupons)
      .values(chunk.map((seed) => seed.row))
      .onConflictDoUpdate({
        target: coupons.slug,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          terms: sql`excluded.terms`,
          kind: sql`excluded.kind`,
          code: sql`excluded.code`,
          discountType: sql`excluded.discount_type`,
          discountValue: sql`excluded.discount_value`,
          destinationUrl: sql`excluded.destination_url`,
          startsAt: sql`excluded.starts_at`,
          expiresAt: sql`excluded.expires_at`,
          isVerified: sql`excluded.is_verified`,
          isFeatured: sql`excluded.is_featured`,
          isExclusive: sql`excluded.is_exclusive`,
          searchDocument: sql`excluded.search_document`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: coupons.id, slug: coupons.slug });

    rows.forEach((row, index) => {
      const seed = chunk[index];
      if (!seed) return;
      insertedCoupons.push({
        id: row.id,
        merchantSlug: seed.merchantSlug,
        categorySlugs: seed.categorySlugs,
        featured: Boolean(seed.row.isFeatured),
      });
    });
  }

  console.log(`✓ ${insertedCoupons.length} coupons`);

  /* ── coupon ↔ categories ───────────────────────────────────────────────── */
  const links: { couponId: number; categoryId: number }[] = [];
  for (const coupon of insertedCoupons) {
    for (const slug of coupon.categorySlugs) {
      const category = categoryBySlug.get(slug);
      if (category) links.push({ couponId: coupon.id, categoryId: category.id });
    }
  }

  for (let i = 0; i < links.length; i += 500) {
    await db
      .insert(couponCategories)
      .values(links.slice(i, i + 500))
      .onConflictDoNothing();
  }
  console.log(`✓ ${links.length} category links`);

  /* ── synthetic interaction history ─────────────────────────────────────────
     Gives "trending", counters and the analytics tables real shape. Volumes
     are biased toward verified/featured offers, which is how a live catalogue
     normally behaves.                                                        */
  console.log("→ generating interaction history");

  const eventRows: (typeof couponEvents.$inferInsert)[] = [];

  for (const coupon of insertedCoupons) {
    const weight = (coupon.featured ? 3 : 1) * (0.4 + random());
    const clicks = Math.floor(random() * 26 * weight);
    const copies = Math.floor(clicks * (0.5 + random() * 0.8));
    const views = Math.floor(clicks * (3 + random() * 6));

    const push = (type: "click" | "copy" | "view", count: number) => {
      for (let i = 0; i < count; i += 1) {
        const createdAt = new Date(now.getTime() - Math.floor(random() * 14 * DAY));
        eventRows.push({
          type,
          couponId: coupon.id,
          visitorId: randomVisitorId(),
          hourBucket: startOfHour(createdAt),
          createdAt,
          payload: null,
        });
      }
    };

    push("view", Math.min(views, 120));
    push("copy", Math.min(copies, 60));
    push("click", Math.min(clicks, 40));
  }

  // A handful of searches, so the analytics tables are not coupon-only.
  for (let i = 0; i < 120; i += 1) {
    const term = seedMerchants[Math.floor(random() * seedMerchants.length)]?.name ?? "nike";
    const createdAt = new Date(now.getTime() - Math.floor(random() * 14 * DAY));
    eventRows.push({
      type: "search",
      visitorId: randomVisitorId(),
      hourBucket: startOfHour(createdAt),
      createdAt,
      payload: { q: term },
    });
  }

  // Shuffle so inserts are not clustered; the dedupe index absorbs collisions.
  for (let i = eventRows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [eventRows[i], eventRows[j]] = [eventRows[j]!, eventRows[i]!];
  }

  for (let i = 0; i < eventRows.length; i += 500) {
    await db.insert(couponEvents).values(eventRows.slice(i, i + 500)).onConflictDoNothing();
  }
  console.log(`✓ ${eventRows.length} events`);

  /* ── rebuild the counter cache from events ──────────────────────────────── */
  await db.execute(sql`
    update ${coupons} c
       set view_count = coalesce(t.views, 0),
           copy_count = coalesce(t.copies, 0),
           click_count = coalesce(t.clicks, 0),
           updated_at = now()
      from (
        select coupon_id,
               count(*) filter (where type = 'view')  as views,
               count(*) filter (where type = 'copy')  as copies,
               count(*) filter (where type = 'click') as clicks
          from ${couponEvents}
         where coupon_id is not null
         group by coupon_id
      ) t
     where t.coupon_id = c.id
  `);

  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)` }).from(coupons);

  console.log("✓ counters rebuilt from events");
  console.log(`\nDataset ready: ${total} coupons, ${merchantBySlug.size} merchants, ${categoryBySlug.size} categories`);

  await closeDb();
}

main().catch((error) => {
  console.error("✗ seed failed:", error);
  process.exit(1);
});
