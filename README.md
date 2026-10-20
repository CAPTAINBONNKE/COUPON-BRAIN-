# COUPON BRAIN

A coupon discovery and savings platform: find the offer, understand what it is
actually worth, and get the code with as little friction as possible.

> **Status — greenfield build.** This repository contained only a `README.md`
> before this work, so the entire application was built from scratch. See
> [What is not built yet](#what-is-not-built-yet) for what was deliberately
> deferred.

---

## The product idea

Most coupon sites fail in one of three ways: the code is expired, the discount
is misrepresented, or the site makes you hunt for the thing you came for.

COUPON BRAIN is built around one rule: **expiry and availability are decided on
the server, from the database clock — never in the browser.** If the site says
an offer is live, it was live at the moment the page was rendered.

The user journey the UI is designed around:

```
DISCOVER → UNDERSTAND → GET DEAL → SAVE → RETURN
```

---

## Stack

| Layer        | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router) + React 19 + TypeScript (strict)       |
| Styling      | Tailwind CSS v4 with a CSS-first design-token system           |
| Database     | PostgreSQL (Supabase in production, embedded Postgres locally) |
| Data access  | Drizzle ORM + generated SQL migrations                         |
| Validation   | Zod — every user input validated server-side                   |
| Icons        | lucide-react                                                   |

No UI component library, no animation library, no client state library. The
design system and every component are local and small on purpose.

### Why the database runs two ways

There is **one schema** (`src/db/schema.ts`) and **one set of migrations**
(`db/migrations/`). Two drivers speak the identical SQL:

| `DATABASE_URL`      | Driver                     | Use                                  |
| ------------------- | -------------------------- | ------------------------------------ |
| **set**             | `postgres.js` → PostgreSQL | Supabase / any hosted Postgres        |
| **unset**           | PGlite (WASM Postgres)     | Local dev & QA, stored in `./.data`   |

This means the app runs, seeds and can be fully exercised with zero external
services, and moving to Supabase is a single environment variable. It is **not**
two databases — the local one is a development convenience, never a second
source of truth.

---

## Getting started

```bash
npm install

# 1. create the schema
npm run db:migrate

# 2. load the demo catalogue (38 merchants, 12 categories, ~130 offers)
npm run db:seed

# 3. run
npm run dev          # http://localhost:3000
```

That's it — no database server, no credentials, no Docker.

### Pointing at Supabase

1. Create a Supabase project.
2. Supabase → *Project Settings* → *Database* → *Connection string*.
3. Put the **transaction pooler** URL (port `6543`) in `.env`:

   ```
   DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require"
   NEXT_PUBLIC_SITE_URL="https://your-domain.com"
   VISITOR_HASH_SALT="a-long-random-string"
   ```

4. `npm run db:migrate` (use the **direct** connection on port `5432` for this
   step if the pooler refuses DDL), then `npm run db:seed`.

`DATABASE_URL` set ⇒ the app uses Supabase. Unset ⇒ local embedded Postgres.
No code changes either way.

> No Supabase **browser** keys are used anywhere: this build has no client-side
> data access, so there is nothing to leak.

### Scripts

| Command               | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `npm run dev`         | Dev server on `0.0.0.0:3000`                         |
| `npm run build`       | Production build                                     |
| `npm run typecheck`   | `tsc --noEmit`                                       |
| `npm run lint`        | ESLint (Next + TypeScript)                           |
| `npm run qa`          | typecheck + lint + build                             |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts`         |
| `npm run db:migrate`  | Apply migrations                                     |
| `npm run db:seed`     | Load the demo catalogue (idempotent — re-runnable)   |
| `npm run db:recount`  | Rebuild popularity counters from the events table    |
| `npm run db:reset`    | Drop the **local** database (refuses if `DATABASE_URL` is set) |
| `npm run db:studio`   | Drizzle Studio                                       |

---

## Architecture

```
USER → UI (server components) → query layer → Drizzle → PostgreSQL
                              ↘ route handlers (/api/*, /go/*)
```

Everything user-facing is a **server component** that reads the database
directly — there is no internal REST layer in front of the UI to keep in sync.
Client components are used only where interactivity genuinely requires them
(search autocomplete, copy-to-clipboard, save-for-later, mobile sheets).

### Route map

| Route                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `/`                    | Homepage: hero search, featured, stores, categories, high-value, trending, ending-soon, recently added, how-it-works |
| `/deals`               | Canonical browse: search + filters + sort + pagination  |
| `/deals/ending-soon`   | Offers expiring within 7 days                            |
| `/categories`          | Category index with live counts                          |
| `/categories/[slug]`   | Category page                                            |
| `/stores`              | Store directory with live counts                         |
| `/stores/[slug]`       | Store page: identity, categories, all live offers        |
| `/coupon/[slug]`       | Coupon detail: value, code, terms, how to use, related   |
| `/saved`               | Device-local shortlist, re-checked live on every visit   |
| `/api/suggest`         | Autocomplete (stores, categories, deals)                 |
| `/api/events`          | Analytics write (view / copy / click / search)           |
| `/api/coupons`         | Re-hydrate saved slugs                                   |
| `/go/[slug]`           | Tracked outbound redirect                                |
| `/sitemap.xml`, `/robots.txt` | SEO                                              |

---

## Data model

```
merchants ──┬─< coupons >─┬─< coupon_categories >─┬─ categories
            │             │
            └─────────────┴─< coupon_events
```

### Source of truth

- `merchants`, `categories`, `coupons`, `coupon_categories` — authoritative records.
- `coupon_events` — append-only log of every user interaction (authoritative for analytics).
- `coupons.view_count / copy_count / click_count` — a deliberate **cache** of
  aggregates over `coupon_events`, so listings can sort by popularity without
  aggregating millions of rows per request.

```
SOURCE OF TRUTH (coupon_events) → CACHE (coupons.*_count) → APPLICATION
```

The counters are incremented inside the **same transaction** as the event
insert, and `npm run db:recount` rebuilds them from scratch.

- `coupons.search_document` / `search_vector` — a **search index** over
  title + merchant + categories + code, maintained on write, with a GIN index.

### Coupon validity is derived, never stored

The database stores only the facts: `is_disabled`, `starts_at`, `expires_at`.
Status is computed from them against the database clock:

| Status      | Condition                            |
| ----------- | ------------------------------------ |
| `disabled`  | `is_disabled = true` (editorial)     |
| `scheduled` | `starts_at > now()`                  |
| `expired`   | `expires_at <= now()`                |
| `active`    | otherwise                            |

Defined once and shared by the SQL (`src/db/coupon-status.ts`) and TypeScript
(`deriveStatus` in `src/lib/coupon.ts`). Storing status would duplicate state
and go stale; the client's clock is never consulted.

### Analytics integrity

`coupon_events` has a unique index on
`(coupon_id, visitor_id, type, hour_bucket)`, so a double-click, a retry or an
over-eager client cannot inflate the numbers: the insert is dropped on conflict
and the counter is left alone.

The visitor id is a random opaque value in an httpOnly cookie; the database only
ever stores a **salted SHA-256** of it, so a full table dump cannot be joined
back to a browser.

---

## Design system

Defined once in `src/app/globals.css` as Tailwind v4 theme tokens, then consumed
everywhere — components do not invent their own colours, radii or shadows.

- **Colour** — a cool `ink` neutral scale, `brand` violet for identity and
  primary actions, `save` emerald for money/discounts/verification, `alert`
  amber for urgency, `danger` rose for errors and expiry.
- **Type** — system font stack (pinned `en-US`/UTC formatting so server and
  client output always match and hydration never mismatches).
- **Elevation & radius** — five shadow steps and a consistent radius scale.
- **Motion** — 150–200 ms transitions on meaningful state changes only, plus
  `rise` / `pop-in` / `slide-up` entrances. All decorative animation is disabled
  under `prefers-reduced-motion`.

### Images

There are **no raster images in the product surface**. Merchants get a
deterministic wordmark (their brand colour when known, otherwise a colour hashed
from their name) rendered in CSS/SVG. This removes broken images, layout shift
and irrelevant stock photography entirely — and a `logo_url`, when present, is
layered over the wordmark so a broken logo degrades gracefully.

The only image asset is `public/og.png` (1200×630 Open Graph banner).

---

## Notable implementation details

- **Search** — debounced (250 ms), abortable, full keyboard support with proper
  `combobox` semantics. Full-text search via a generated `tsvector` + GIN index;
  short or code-like terms additionally substring-match title and code so
  searching `SAVE20` works. Autocomplete covers stores, categories and deals.
- **Filters** — every option is a real link, so filtering works without
  JavaScript and every filtered view has a shareable, crawlable URL. All counts
  come from `getDealFacets()`; no filter is decorative.
- **Container queries** — deal grids size their columns from their *container*,
  not the viewport, so cards stay readable both full-bleed and inside the
  narrow `/deals` column next to the sidebar.
- **Copy-to-clipboard** — the success state is shown **only** when the clipboard
  write actually succeeded; failure degrades to "select the code and press
  Ctrl+C". Clipboard API with a hidden-textarea fallback for insecure contexts.
- **`/go/[slug]`** — re-derives coupon status server-side before redirecting,
  refuses non-`http(s)` destinations (no open redirect, no `javascript:` URLs),
  records the click, and sends internal redirects as **relative** `Location`
  headers so they work unchanged behind any proxy or custom domain.
- **Rate limiting** — in-memory token bucket on every write endpoint. Single
  process by design; swap for Redis when running multiple instances (call sites
  stay identical).
- **Logging** — structured, JSON in production, with automatic redaction of
  password/token/cookie-shaped keys. Never logs secrets.
- **Loading, empty and error states** — skeleton loaders that mirror real
  layout, specific empty states with a next action, and error boundaries at
  route and root level.

## Security

Server-side validation of every input (Zod), parameterised queries only,
httpOnly cookies, hashed visitor ids, rate limiting, `nosniff` and
`Referrer-Policy` headers, and outbound links marked
`rel="noopener noreferrer nofollow sponsored"`.

`X-Frame-Options` / a restrictive CSP `frame-ancestors` are **deliberately not
set** because the app is embedded in preview iframes — add them in production if
framing is never wanted.

`npm audit` reports only dev-toolchain advisories (esbuild dev server,
`eslint-config-next`'s transitive `micromatch`/`braces`, and the `postcss`
version bundled inside Next). The one runtime-relevant advisory found during the
build — a SQL-injection issue in `drizzle-orm < 0.45.2` — was fixed by upgrading.

---

## What is not built yet

Chosen deliberately, in that order of priority:

1. **Authentication and accounts.** No signup, login, sessions, or password
   handling. Consequently there is no `users` table.
2. **Admin dashboard.** No CRUD console, no role model, no `/admin`. Adding it
   requires auth first — hiding a link is not authorization, so it would have
   been security theatre.
3. **Saved deals are device-local** (localStorage) because there is no account
   to attach them to. Only slugs are stored; `/saved` re-reads every coupon from
   the database on each visit, so codes and expiry are never stale. Moving to
   accounts means adding a `saved_coupons` table — the page itself needs no
   change.

When auth lands, roles should be enforced in a server-side guard (a `users.role`
check inside every mutating query/action), never by hiding UI.

## Known limitations

- **The seeded catalogue is demo data.** Real merchants and their real
  homepages are used, but the codes, discounts and expiry dates are
  illustrative and not verified offers. Replace before production use.
- Pages are `force-dynamic` (always fresh). On hosted Postgres you can switch
  the homepage and listing pages to ISR with `export const revalidate = 300`.
- The rate limiter is per-process.
- `NEXT_PUBLIC_SITE_URL` should be set in production so canonical URLs, OG tags
  and `sitemap.xml` use the real domain.
- Visual QA was done by inspecting server-rendered HTML and the compiled CSS;
  no headless browser was available in the build environment, so a true
  rendered-browser screenshot pass has not been run.

## Quality gates

```bash
npm run qa     # typecheck + lint + build
```

All three pass clean.

> Do not run `npm run build` while `npm run dev` is running — they share
> `.next/` and the collision produces confusing bundler errors.
