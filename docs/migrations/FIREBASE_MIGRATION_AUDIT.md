# Firebase Migration Audit — COUPON BRAIN

**Repository:** `CAPTAINBONNKE/COUPON-BRAIN-`  
**Audited branch:** `main`  
**Audit date:** 2026-10-31  
**Status:** Discovery and migration design only. No production service has been switched.

## Executive finding

The repository is a Next.js 15 / React 19 server-rendered application using Drizzle ORM and PostgreSQL. Its production PostgreSQL host is described as Supabase, while local development uses PGlite (embedded PostgreSQL). It does not declare Supabase Auth, browser SDK or Supabase Storage dependencies in the inspected package manifest. Therefore, this is primarily a **PostgreSQL-to-Firebase data-layer migration**, not a Supabase client replacement.

The database schema is deliberately PostgreSQL-specific: identity columns, SQL expressions, full-text search via `tsvector`, numeric types, indexes, transactionally maintained aggregate counters and event logs. Firestore is not a drop-in SQL-compatible replacement. A proper migration must redesign data access patterns and preserve coupon validity, event truth, counters, search, expiry and click/claim behavior.

## Verified source inventory

| File | Verified finding | Required migration |
|---|---|---|
| `README.md` | Supabase-hosted PostgreSQL in production; PGlite for local development; one Drizzle schema/migration set | Replace architecture and local-development guidance with Firebase Emulator Suite and Firestore |
| `package.json` | Drizzle ORM, `postgres`, PGlite and Drizzle Kit; no Supabase JS SDK in inspected manifest | Add Firebase Admin/Web SDK as needed; remove SQL drivers and Drizzle only after all runtime/migration consumers are replaced |
| `.env.example` | `DATABASE_URL` points to hosted PostgreSQL; `VISITOR_HASH_SALT` protects anonymous visitor attribution | Replace DB connection with Firebase project config/Admin credentials; preserve stable visitor hash salt |
| `src/db/schema.ts` | PostgreSQL-specific tables and indexes; events are authoritative, coupon counters are transactionally maintained caches; coupon status is derived from database time | Design Firestore documents, event append strategy, counter consistency and server-authoritative time |
| `drizzle.config.ts` | PostgreSQL dialect and generated SQL migrations | Retire after verified Firestore migration; replace with Firestore indexes/rules/emulator configuration |

## Domain invariants to preserve

1. Merchants, categories, coupons and coupon-category relationships are authoritative records.
2. `events` is the append-only source of truth for user interactions.
3. Coupon interaction counters are derived caches and must not become an independent source of truth. Current design increments counters in the same SQL transaction as event insertion and supports a full recount.
4. Coupon status is derived at request time: disabled, scheduled, expired or active. It must use trusted server time, not the browser clock.
5. Search uses PostgreSQL full-text search and merchant prefix matching today. Firestore needs an explicit search design; naive substring scans or unbounded collection reads are not acceptable.
6. Coupon redemption/click analytics must remain idempotent where required and resistant to forged client-side counts.
7. Affiliate destination URLs must remain validated against the merchant host as documented in the README.

## Target Firebase architecture

- **Database:** Cloud Firestore for merchants, categories, coupons, coupon-category references, append-only interaction events and administrative records.
- **Trusted server:** Firebase Admin SDK in Next.js server-only modules; every privileged write validates identity, role and payload.
- **Authentication:** No Supabase Auth dependency was found in the inspected manifest. Determine whether the product currently has accounts or is intentionally anonymous before introducing Firebase Authentication. Do not add mandatory sign-in without a product requirement.
- **Search:** Use a defined search strategy—bounded normalized fields and prefix indexes for modest catalogues, or a dedicated search provider if requirements exceed Firestore query capabilities. Do not emulate PostgreSQL `tsvector` with unbounded client scans.
- **Expiry:** Derive coupon status using trusted server time. Scheduled status transitions are not required if status is computed at read time; any cleanup or notifications should use Cloud Scheduler/Functions.
- **Analytics:** Append interaction events with server validation and idempotency keys. Use Firestore transactions or a controlled aggregation pipeline for counters; consider sharded counters if write volume warrants them. Reconciliation must be able to rebuild counters from events.
- **Hosting:** Next.js server routes and server rendering require a compatible Node.js runtime. Verify Hostinger's available Node hosting before promising a static upload; static export cannot run dynamic API routes.

## Migration phases

1. Complete a repository-wide inventory of all DB imports, Drizzle queries, SQL migrations, scripts, route handlers and server actions.
2. Capture the complete schema, constraints, indexes, triggers and query patterns; map each to Firestore collections and access paths.
3. Define document ID strategy, event retention, counter consistency, coupon search, pagination and expiry semantics.
4. Add Firebase project configuration, Admin initialization, Emulator Suite, Firestore Rules and automated rules tests.
5. Implement server-side Firestore repositories and replace all Drizzle/PostgreSQL query paths.
6. Rebuild event writes and counter updates with idempotency, transaction semantics and periodic reconciliation.
7. Replace full-text search deliberately; verify relevance, prefix behavior, sorting and pagination.
8. Export source data, transform deterministic IDs and relationships, import to a staging Firebase project, and compare counts/aggregates.
9. Run unit, emulator, integration, load and build checks; validate expiry at boundary times and concurrent interaction writes.
10. Cut over only after backup, reconciliation and rollback approval. Remove SQL drivers, Drizzle, PGlite, SQL migrations and database environment variables only when no runtime or maintenance script still uses them.

## Safety gates

- No Firebase project configuration or production database export was verified during this audit.
- Do not assume PGlite is production data; it is documented as local development storage.
- Do not remove the current PostgreSQL database until imported data and event/counter reconciliation are verified.
- Do not move trusted coupon expiry, affiliate URL validation or event counting into browser-only code.
- Do not introduce accounts or collect personal data without a product requirement.
- Do not claim Firebase migration or Hostinger deployment is complete until runtime compatibility is tested.

## Acceptance criteria

- No PostgreSQL/Drizzle/PGlite runtime remains after cutover unless a documented exception is approved.
- Firestore preserves authoritative merchant/category/coupon data and append-only interaction events.
- Coupon state remains server-time-derived and correct at start/expiry boundaries.
- Counters are consistent with source events and can be rebuilt/reconciled.
- Search and pagination are bounded, indexed and tested against the existing behavior.
- Affiliate links are validated server-side.
- Firestore Rules and Admin SDK authorization tests pass.
- Lint, typecheck, tests and production build pass.
- Deployment docs match the actual supported Next.js hosting runtime.

## Scope boundary

This audit covers `CAPTAINBONNKE/COUPON-BRAIN-` only. It does not modify or inspect the Church project or any other repository.
