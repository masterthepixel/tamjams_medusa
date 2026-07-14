# TamJams Product Engineering Steward

## Adopt this persona

When working in this repo, adopt the **TamJams Product Engineering Steward** — you own the codebase and the running services end to end. This file is the single onboarding document: it carries the operational knowledge (live URLs, service IDs, deploy mechanics, credential state) that exists nowhere else in the repo. Read it before touching backend TS, deploying either side, or changing anything that money or the live catalog depends on. `CLAUDE.md` should point here.

TamJams is a **young project** (one product live, a 192-test suite, no real customers yet). The steward's job right now is to keep the thin system honest, ship it toward a real launch, and not lose the hard-won operational lessons that each cost a failed deploy.

## Product

**Tam's Jams** — small-batch, real-fruit jams. Brand story: Tamara, an Armenian immigrant who traded a Hollywood fashion-design dream for family and jam-making; her filmmaker grandson encouraged her to share her jams with the world. Every product description prepends the shared brand story. Positioning is gourmet/homemade ("Real Fruit", "Non-GMO", "Homemade", "No Additives"); explicitly **not** a health food (35 cal/serving, 8g added sugar, 0 fiber — `docs/prd/product-nutrition-analysis.json` says do not position as health food).

> **Brand-name inconsistency (open):** customer-facing copy uses two spellings — **"TamJams"** (nav wordmark, footer, root metadata/OG siteName) vs **"Tam's Jams"** (hero, home metadata, shop page titles). Pick one before launch. See the gaps register below.

## System map

### Monorepo layout

pnpm workspace, `packages: ["apps/*"]` (`pnpm-workspace.yaml`). Root `package.json` is thin/private with no scripts. Node pinned to **22** (`.node-version`; Medusa needs Node <25 and global node is 25 — too new).

```
apps/
  medusa/       # Medusa 2.17.2 backend + Admin UI (@dtc/backend); tests in
                #   src/migration-scripts/__tests__/ + integration-tests/
  storefront/   # Next.js App Router storefront (Medusa starter, rebranded);
                #   Vitest suite in src/**/__tests__/
e2e/            # Playwright suite — orchestrates both servers on the LOCAL DB
docs/prd/       # agent specs, PRD, catalog source data, superseded blueprints
docs/TESTING.md # the four test layers: commands, coverage, landmines
render.yaml     # Render service shape (documentation only — see Deploy ops)
docker-compose.yml
skills-lock.json
.mcp.json       # project-scoped Supabase MCP
.claude/agents/ # 6 subagent personas (the pipeline that built this repo)
.github/workflows/test.yml  # CI: storefront + backend suites on push/PR
```

### Live topology (as of 2026-07-13, $7/mo total)

| Piece | Where | ID / details |
|---|---|---|
| Storefront | Vercel — https://tamjams-medusa-medusa-gvkw.vercel.app | project `tamjams-medusa-medusa-gvkw` (`prj_50JqPVIeIh8ZhC68EdDr2uK7ei5t`), team `team_siqxVRLoYmE5mVrUjaYGw29e` (masterthepixel's Team). $0 |
| Backend + Admin | Render — https://tamjams-medusa.onrender.com (Admin at `/app`) | web service `srv-d9ae3cecjfls739n2qp0`, **Starter $7/mo**, region oregon, rootDir `apps/medusa` |
| Database | Supabase project `hymffpkuzcttrwjftgym` (free) | Postgres 17, session pooler `aws-1-us-west-2.pooler.supabase.com:5432`. Project-scoped Supabase MCP in `.mcp.json` |

Backend Postgres = Supabase. Storefront = Vercel. Medusa/Admin = Render. Redis is **intentionally not provisioned** on Render — Medusa v2 falls back to in-memory on a single instance; add Upstash/Render KV only at scale.

### Local development

- Shells: **always** `eval "$(fnm env)" && fnm use 22` first — global node 25 breaks Medusa.
- pnpm everywhere (backend pins `pnpm@8.6.0`).
- Local infra: `docker compose up -d` gives Postgres `:5432` (user/pass/db all `tamjams`, volume `tamjams-postgres`) and Redis on host port **6389** (`6389:6379`). **Redis is on 6389, not 6379, because 6379 is taken by `tam-jams-backend` — a DIFFERENT legacy project on this machine.** `apps/medusa/.env.template`'s `REDIS_URL` already targets 6389. This is tribal knowledge with no inline comment in `docker-compose.yml` — do not "fix" it to 6379.
- Storefront dev runs on `:8000` (Turbopack); its SSG needs a reachable backend at build time (see High-risk flows). Local backend dev server is `:9000`.

## How everything works

### Product model

**Two product shapes coexist** (per the user's 2026-07-14 decision):
1. The configurator product ("TamJams Jar", handle `tamjams-jar`): **7 flavors × 3 sizes = 21 variants**, SKUs `TJ-<FLAVOR>-<SIZE>` — drives `/shop/[config]`.
2. **Seven standalone per-flavor products** (handles from `product-data.json`: `apricot-jam` … `sour-cherry-jam`), each with a Size option → 3 variants, SKUs `TJF-<FLAVOR>-<SIZE>` — surface on the starter `/store` and `/products/[handle]` routes. Owned by the `product-creator` agent.

- Flavors (catalog order): APRICOT, STRAW(berry), BLUE(berry), RASP(berry), APPLE, QUINCE, SRCHERRY (sour cherry).
- Sizes: SMALL 8oz/227g **$14.89**, MEDIUM 12oz/340g **$22.89**, LARGE 18oz/510g **$33.89** (qty 100 each). Prices stepped by volume; the Quince/Sour-Cherry "premium tier" was deliberately **not** invented — that's a real pricing call left to the user.
- SKU scheme (authoritative): `TJ-<FLAVOR>-<SIZE>` e.g. `TJ-APRICOT-SMALL` (`catalog-seed.ts:185` `skuFor`).
- **Prices are DECIMAL DOLLARS, not cents.** Medusa 2.17 stores money as-is (`price.amount` numeric): 14.89 is stored as 14.89. Passing 1489 creates $1,489 jars. This applies to variant prices (`catalog-seed.ts:249`) and the $5 shipping rate (`shipping-seed.ts`, `amount: 5`).
- Variant metadata carries: flavor, size_oz, subtitle, description, highlights, ingredients, net_weight, storage, nutrition, image. Shared nutrition (35 cal, 20 servings) and highlights are constants; `BRAND_STORY` is prepended to every description.

All real backend business logic lives in the three migration-scripts. The custom API routes (`src/api/admin/custom`, `src/api/store/custom`) are starter GET-200 stubs; subscribers, workflows, links, jobs, modules, admin extensions are all empty scaffolding.

### The three migration-scripts (`apps/medusa/src/migration-scripts/`)

Each default-exports `async ({ container })`, is auto-discovered, and runs **once** via `medusa db:migrate` (after schema migrations), tracked in the `script_migrations` table. Most also guard idempotency in-body.

1. **`initial-data-seed.ts`** — creates sales channel "TamJams Storefront", a publishable API key linked to it, store "TamJams" (usd), and region "United States" (usd, `["us"]`, `payment_providers: ["pp_system_default"]`). No in-body guard; relies on run-once tracking. IDs are generated at runtime.
2. **`catalog-seed.ts`** — the 21-variant catalog above. Idempotent: returns early if product handle `tamjams-jar` exists. Also creates/reuses stock location "TamJams Warehouse", links inventory levels, and batches per-flavor variant images. Hardcodes `SALES_CHANNEL_ID = "sc_01KXCSZGBHJ9HXPEHKQYBCCXG1"` (see IDs table).
3. **`shipping-seed.ts`** — fulfillment set "TamJams US Delivery", US service zone, flat-rate "Standard Shipping" **$5.00** (manual provider `manual_manual`). Idempotent on any existing shipping option. **Throws "Run the catalog seed first." if the default shipping profile is missing** — so catalog-seed must run before shipping-seed.

#### Seeding cookbook (how to change the catalog)

`catalog-seed.ts` is the worked example for all product seeding. To change the live catalog:

- **New flavor**: add a `FlavorSpec` to `FLAVORS` in `catalog-seed.ts` (copy an existing entry; source copy from `docs/prd/product-data.json`). But note the seed **won't re-run** — it's tracked in `script_migrations` AND returns early because `tamjams-jar` exists. For an already-seeded DB, write a NEW migration-script (e.g. `add-<flavor>-flavor.ts`) that adds the option value + 3 variants + prices + inventory to the existing product via `updateProductsWorkflow`/variant-create workflows — idempotent, guarded by a variant-SKU existence check. Load the `building-with-medusa_medusa` skill first.
- **Price change**: don't edit the seed for a live DB — update prices via Admin UI or a new migration-script using the pricing workflows. Decimal dollars, always.
- **Fresh database** (new env/branch): just run `pnpm exec medusa db:migrate` — schema + all three seeds run in order automatically.
- **Rules that always apply**: idempotent (safe to re-run), deterministic SKUs `TJ-<FLAVOR>-<SIZE>`, prices in decimal dollars, wire to sales channel `sc_01KXCSZGBHJ9HXPEHKQYBCCXG1`, inventory at "TamJams Warehouse", image path `/images/products/<handle>.jpg`.

### The configurator (storefront)

The one custom interactive surface. Route `/[countryCode]/shop/[config]`, static via `generateStaticParams` (every region country × 21 variants; `try/catch → []` on failure).

- **URL-as-state**: the config segment is `<flavor-slug>-<oz>oz` (e.g. `sour-cherry-18oz`). Selecting an option does `router.replace(.../shop/${config}, {scroll:false})` in a `startTransition` — no client store, back button restores state (`jam-configurator`, the single client island).
- `parseConfig` (`src/lib/util/tamjams.ts:29`): regex `/^(.+)-(\d+)oz$/` (greedy group 1 allows dashed slugs, anchors on `-<digits>oz`). `resolveVariant` (`:55`) matches slugified `metadata.flavor` + `metadata.size_oz` (with Option-value fallbacks).
- `getJarProduct` (`src/lib/data/tamjams.ts`, `"use server"`) fetches the `tamjams-jar` handle with all 21 variants + calculated_price + inventory + images + metadata; shared by home and configurator. Prices **always** come from Medusa, never hardcoded.
- `option-radio-group` is a full WAI-ARIA radiogroup (roving tabindex, arrow-key wrap, Space/Enter, disabled = line-through). Add-to-cart uses the `addToCart` server action + `router.refresh()`.
- **Related Products:** Appends a dynamic `RelatedProducts` card grid at the bottom of the page to cross-sell other jam flavors.

### Cart / checkout + Stripe

- Cart data layer: `src/lib/data/cart.ts` (`"use server"`) — retrieve/getOrSet/add/update/delete line items, shipping, payment session, promotions, addresses, `placeOrder`. Mutators `revalidateTag`.
- Checkout steps: Addresses → Shipping → Payment → Review. `placeOrder` → `sdk.store.cart.complete`; on `type==="order"` it clears the cart cookie and redirects to `/order/[id]/confirmed`.
- **Stripe is conditionally wired on both ends:**
  - Backend (`medusa-config.ts:21`): the Stripe payment module is registered **only if `STRIPE_API_KEY` is set** (`modules: stripeApiKey ? [...] : []`). Stripe's loader throws on an empty key, so a missing key must not block boot/migrations — that's why it's conditional.
  - Storefront: `StripeWrapper` renders only when `isStripeLike(provider_id)` (prefix `pp_stripe_`/`pp_medusa-`) AND there's a pending session AND a publishable key (`NEXT_PUBLIC_STRIPE_KEY || NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY`). `stripe-wrapper` throws if key/promise/client_secret is missing.
- The $5 flat shipping shown at checkout comes from the backend `shipping-seed`, not the storefront.

## Deploy operations

Two independent deploy paths with **opposite triggering behavior** — this is the single most important operational fact.

### Render (backend + Admin) — MANUAL

- **Pushes do NOT auto-deploy.** The service was created from a public-repo-URL Blueprint flow with no GitHub-app webhooks. The original Blueprint was later **deleted** (it couldn't sync and blocked plan changes), so nothing consumes `render.yaml` automatically anymore — it's documentation of the service shape only.
- Deploy manually:
  ```
  curl -X POST https://api.render.com/v1/services/srv-d9ae3cecjfls739n2qp0/deploys \
    -H "Authorization: Bearer $RENDER_API_KEY"
  ```
  (`RENDER_API_KEY` lives in repo-root `.env.local`, gitignored; owner/team `tea-d9a4ldt8nd3s73afh1h0`.) Or use the dashboard's Manual Deploy.
- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm build && cd .medusa/server && pnpm install --ignore-workspace`. **The `--ignore-workspace` is load-bearing:** `.medusa/server` sits inside the pnpm workspace, so a bare install resolves as a workspace install and never links the `medusa` bin (→ spawn `medusa` ENOENT at start).
- Start command: `cd .medusa/server && pnpm exec medusa db:migrate && pnpm run start` — **migrations run at boot**. This is a leftover of the free tier's no-`preDeployCommand` rule. Safe to move back to `preDeployCommand` now that the plan is Starter — **not yet done** (gaps register).
- Plan changes go through the **dashboard** (Settings → Instance Type); the Render API returns 500 on plan changes for free services.
- Env-var changes require triggering a deploy to take effect. Service env vars: `NODE_VERSION=22`, `DATABASE_URL` (Supabase pooler), `JWT_SECRET`/`COOKIE_SECRET` (Render-generated), `ADMIN_CORS` = the onrender URL, `STORE_CORS` & `AUTH_CORS` = the Vercel prod domain, `STRIPE_API_KEY` (unset).

### Vercel (storefront) — AUTO on push

- **The user's Vercel GitHub integration auto-imports this repo on push** (that's how the project was created — originally misconfigured as rootDir `apps/medusa`, framework vite, Node 24; fixed to rootDir `apps/storefront`, framework nextjs, Node 22.x). **Watch for stray auto-created duplicate projects after a push** and delete them.
- Env vars (Production + Preview): `NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://tamjams-medusa.onrender.com`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_1831…05ef`, `NEXT_PUBLIC_DEFAULT_REGION=us`, `NEXT_PUBLIC_BASE_URL=`the Vercel prod domain.
- Vercel CLI v53, authenticated as masterthepixel; repo linked via gitignored `.vercel/project.json`. Quirk: `vercel api` PATCH rejects `-d` JSON bodies — use `-f key=value` fields.

### Two-phase first deploy (documented in `render.yaml`)

Set `DATABASE_URL` (Supabase session pooler) → deploy backend → deploy Vercel storefront → fill `STORE_CORS`/`AUTH_CORS` (Vercel URL) + `ADMIN_CORS` (own URL) + `STRIPE_API_KEY` in the dashboard → redeploy.

## The agent team & skills

This repo was built by — and should continue to be extended through — a **six-agent pipeline** in `.claude/agents/` (each `.md` is byte-identical to its `docs/prd/` source spec). Delegate feature work through this pipeline rather than editing everything inline.

| Agent | Model | Owns |
|---|---|---|
| `medusa-backend` | sonnet (restricted tools) | `apps/medusa` config, region/sales-channel/publishable-key, Stripe provider, migrations. Owns the single-product-with-variants model decision. |
| `catalog-seeder` | haiku (restricted) | Idempotent seeds, deterministic `TJ-<FLAVOR>-<SIZE>` SKUs, upsert by SKU/handle, summary table. |
| `product-creator` | haiku (restricted) | Ongoing product creation/maintenance from `docs/prd/product-data.json` — standalone per-flavor products (`TJF-<FLAVOR>-<SIZE>` SKUs), new flavors, price/inventory changes, always via idempotent migration-scripts. |
| `storefront-builder` | sonnet (inherit-all) | Home + `/shop/[config]` configurator, generateStaticParams/Metadata, URL-as-state, sticky buy bar, prices always from Medusa. |
| `ui-components` | haiku (restricted) | Pure presentational React/Tailwind from specs; all states; a11y radiogroup required; no data/routing. |
| `checkout-integrator` | sonnet (inherit-all) | Cart + Stripe (Elements only, never raw card data), order confirmation, email. "Trickiest, highest-risk." |
| `qa-reviewer` | haiku (read-only) | typecheck/lint/build + diff review, PASS/FAIL, never fixes. |

**Pipeline order** (`docs/prd/README.md`): `medusa-backend` → `catalog-seeder` → `storefront-builder` (+`ui-components`) → `checkout-integrator` → `qa-reviewer` after each stage. Model split rationale: haiku = cheap/well-specified/parallelizable; sonnet = reasoning-heavy; bump to opus per-task by editing the `model:` field.

**Installed skills** (`skills-lock.json`, hash-pinned from `supabase/agent-skills`): `supabase` (any Supabase/DB/Auth/RLS/migration task) and `supabase-postgres-best-practices` (Postgres perf guide). `.agents/skills/` holds the real files; `.claude/skills/` are symlinks into them (how Claude Code discovers them).

**Global Medusa skills** (installed at `~/.claude/skills/` on this machine, available in every session here): `building-with-medusa_medusa` (REQUIRED before any backend work — architecture patterns, the decimal-price rule), `building-storefronts_medusa` (REQUIRED before storefront work — SDK/data-layer patterns), `db-generate_medusa` / `db-migrate_medusa` (migrations), `building-admin-dashboard-customizations_medusa` (admin UI), `creating-internal-agents_medusa`. Load the matching skill before touching its territory; the subagent prompts that built this repo did.

**Supabase MCP** (`.mcp.json`): one http server `supabase`, project_ref `hymffpkuzcttrwjftgym` (the live TamJams DB). Needs `claude /mcp` auth per machine.

## High-risk flows / hard rules

- **Prices are decimal dollars, never cents.** (See product model.) A cents mistake ships $1,489 jars.
- **Run BOTH builds before pushing backend TS.** `medusa build` (backend `pnpm build`) is a separate typecheck gate from the storefront build — a TS error in a migration-script once shipped because only the storefront was built locally. The backend build **does** typecheck.
- **Storefront SSG hits the live backend at build time** (`generateStaticParams` for 21 shop pages calls `listRegions`/`getJarProduct`). If the backend is down/unreachable during `next build`, the `try/catch → []` means **zero shop pages get prerendered — silently, no error.** Backend must be up during any storefront build (locally: backend on `:9000`; on Vercel: the Render URL).
- **Never downgrade Render below Starter.** Free tier (0.1 CPU) hits Render's port-scan timeout before Medusa v2 binds — it literally cannot boot. Starter (0.5 CPU) is the working minimum.
- **Secrets/env hygiene:** `.gitignore` blanket-ignores `.env`/`.env.*` and un-ignores only `!.env.example`/`!.env.template`. Real envs (`apps/medusa/.env`, storefront `.env.local`, root `.env.local` with the Render key) are never committed. Do not commit secrets.
- **Rotate ALL credentials at launch** (user's explicit plan) — the Supabase DB password was shared in-session and reused local + Render. See launch checklist.
- Follow the user's coding conventions: no comments unless the WHY is non-obvious, edit-over-create, validate only at boundaries, short responses, `file:line` refs.
- **Tests never touch production.** Every test layer is forced onto the local Docker Postgres: backend integration via `integration-tests/setup.js` (hard-throws on any non-local DB host), E2E via `e2e/setup/backend.mjs` (refuses non-local `DATABASE_URL`, spawned-process env beats `.env`). Do not weaken these guards.

## Testing

Four layers (full plan: `docs/TESTING.md`). Run before any push that touches the relevant app:

| Layer | Where | Command | Notes |
|---|---|---|---|
| Backend unit (17) | `apps/medusa` | `pnpm test:unit` | seed logic: SKUs, prices, flavors, decimal-dollar guard |
| Backend integration (5) | `apps/medusa` | `pnpm test:integration:http` | boots real Medusa on a throwaway local DB (`pg-god`); Store API, key scoping, full cart→order, seed idempotency |
| Storefront unit+component (161) | `apps/storefront` | `pnpm test` | Vitest/jsdom; `tamjams.ts` exhaustive + a11y component tests |
| E2E (9 scenarios) | `e2e/` | `pnpm test` | Playwright orchestrates both servers on the LOCAL DB (`e2e/README.md`); needs Docker PG up |

CI (`.github/workflows/test.yml`): storefront unit + backend unit/integration on push/PR (Postgres service container). E2E is local/on-demand.

Hard-won test-infra facts (each cost debugging time):
- `@medusajs/test-utils` needs the `pg-god` devDep (creates/drops throwaway DBs) — the starter omitted it; don't remove it.
- The integration runner does NOT run `src/migration-scripts` — suites invoke the seed exports directly via the container.
- **Seeds hardcode the production sales-channel id** (`sc_01KX…`), so a truly fresh DB needs that channel pre-created (E2E's `setup/fixups.mjs` does this) — a portability wart worth fixing eventually.
- `inventory_level.raw_stocked_quantity` (jsonb) is authoritative — SQL that updates only `stocked_quantity` is invisible to Medusa.
- Publishable keys must have exactly ONE sales channel or `+variants.inventory_quantity` queries 400.
- Next dev persists `force-cache` product fetches on disk across restarts — E2E clears `.next/cache/fetch-cache` at startup.

## Known gaps & discrepancies register

Honest inventory of everything currently wrong, stale, or unfinished. None are blocking today's demo, but each is a real cleanup or launch item.

**Branding / copy**
- Brand-name inconsistency: "TamJams" vs "Tam's Jams" across customer-facing copy (see Product).
- Side-menu links point to `/store` (starter route), **not** `/shop` (the real configurator).
- Hero CTA is hardcoded to `/shop/strawberry-8oz`.
- Starter-generic leftovers still live: `medusa-cta` "Powered by Medusa & Next.js", unchanged starter `/store` `/products` `/collections` `/categories` pages, starter `opengraph-image.jpg`/`twitter-image.jpg`, unused home components `featured-products/` `product-rail/`.

**Docs / data drift**
- ~~`render.yaml` header free/$0 comments~~ and ~~PRD "5–6 flavors"~~ — **fixed 2026-07-14**.
- `docs/prd/product-data.json` uses bare SKUs `SMALL`/`MEDIUM`/`LARGE`; the **seeder's `TJ-<FLAVOR>-<SIZE>` is authoritative** for real SKUs. `product-data.json` is catalog source copy, not the SKU source of truth.
- `docs/prd/render_1.yaml` is the **superseded** original full-stack-on-Render blueprint (Render Postgres + 2 services, `preDeployCommand` migrations, no `--ignore-workspace`). Kept for history — do not use.

**Engineering**
- **No storefront type gate.** `next.config.js` sets `typescript.ignoreBuildErrors: true` AND `eslint.ignoreDuringBuilds: true`, and there is no `typecheck` script — the storefront build does **not** gate on types or lint at all. `tsc --noEmit` shows React-19 false positives (@types/react duplication) in starter files, so it isn't a clean gate either. (The backend's `medusa build` **does** typecheck.) **Restoring a real storefront type gate is an open task.** — This corrects the earlier belief that "`pnpm build` is the storefront typecheck gate"; it is not.
- Invalid/stale cart cookie → `retrieveCart` returns null → `notFound()` **hard 404** in both checkout and cart pages (cart not-found only says "Clear your cookies and try again"). No graceful recovery.
- `resolveVariant`'s size fallback (`tamjams.ts:45`) does `parseInt` on Size option values, but seeded values are "Small/Medium/Large" → `NaN`; it only ever works via `metadata.size_oz` (always set by the seed). Dead-weight fallback, not a bug today.
- ~~Back button didn't restore configurator state~~ — **fixed 2026-07-14**: `jam-configurator` used `router.replace`; now `router.push` (caught by the E2E suite's first run).
- Migrations still run at boot inside the Render `startCommand` — could move to `preDeployCommand` now that the plan is Starter.

**Launch-blocking (not wired yet)**
- Product images missing: expected at `/images/products/<flavor-handle>.jpg` in storefront `public/`, not on disk — the `PlaceholderImage` component is the normal render today (`common/product-image` falls back on missing src / onError).
- No email provider: `order.placed` emits with no delivery; needs a Notification provider (e.g. Resend) + subscriber/template.
- Stripe not enabled on the US region: region currently has only `pp_system_default`. Set the keys **and** enable Stripe on the region in Admin.
- The manual-provider **test order #1** ($34.78) in the DB proves the pipeline works — it is **not a real sale**.

## Launch checklist

1. **Stripe:** set `STRIPE_API_KEY` (Render env + local `apps/medusa/.env`) and `NEXT_PUBLIC_STRIPE_KEY` (Vercel env + local storefront `.env.local`); **enable Stripe on the US region in Admin** (region has only `pp_system_default` today). Test with card `4242 4242 4242 4242`, decline `4000 0000 0000 0002`; verify a paid order lands in Admin.
2. **Product images:** add 7 files at `public/images/products/<flavor-handle>.jpg` (handles: `apricot-jam`, etc.).
3. **Email:** configure a Notification provider (e.g. Resend) + subscriber/template so `order.placed` actually sends.
4. **Rotate ALL credentials:** Supabase DB password (was shared in-session, reused local + Render), Render API key, Stripe keys; publishable key optional (public by design).
5. **Resolve the brand-name spelling** and fix the stale docs/copy in the gaps register.

## Quick reference

### Seeded backend IDs (live in Supabase; referenced by seeds/storefront)

| Thing | ID |
|---|---|
| Region US/USD | `reg_01KXCSZJBE8QNZM2GZGYF95SPP` |
| Sales channel "TamJams Storefront" | `sc_01KXCSZGBHJ9HXPEHKQYBCCXG1` |
| Store | `store_01KXCSZHD6GH15Z1Y14YQ8DV0X` |
| Publishable key | `apk_01KXCSZGNPXRED1ZK6E6WPPQGN` → token `pk_1831fdc370bdf2f0d94570bd981dc4bce2e873ceb84f2f3d6eaf45896c6e05ef` (public by design) |

### Commands

```bash
# always first, in every shell
eval "$(fnm env)" && fnm use 22

# local infra (Postgres :5432, Redis :6389)
docker compose up -d

# backend (apps/medusa)
pnpm dev                     # medusa develop (:9000)
pnpm build                   # medusa build — DOES typecheck
pnpm exec medusa db:migrate  # schema + the 3 migration-scripts (run-once)

# storefront (apps/storefront)
pnpm dev                     # next dev, Turbopack (:8000) — needs backend up
pnpm build                   # next build — does NOT gate types/lint; hits live backend for SSG

# deploy backend (Render — pushes do NOT auto-deploy)
curl -X POST https://api.render.com/v1/services/srv-d9ae3cecjfls739n2qp0/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY"

# deploy storefront (Vercel — auto on push; or explicit)
vercel deploy --prod
```

### URLs & service IDs

| | |
|---|---|
| Storefront | https://tamjams-medusa-medusa-gvkw.vercel.app · project `prj_50JqPVIeIh8ZhC68EdDr2uK7ei5t` · team `team_siqxVRLoYmE5mVrUjaYGw29e` |
| Backend + Admin | https://tamjams-medusa.onrender.com (Admin `/app`) · service `srv-d9ae3cecjfls739n2qp0` · team `tea-d9a4ldt8nd3s73afh1h0` |
| Supabase | project `hymffpkuzcttrwjftgym` · pooler `aws-1-us-west-2.pooler.supabase.com:5432` |

---

**Last verified: 2026-07-13** (live IDs, URLs, plan tiers, env-var state — against the running Vercel/Render/Supabase services) and **2026-07-14** (test suite, UI styling upgrades, SEO optimization). Code `file:line` references are from the researcher pass; re-check against the tree if a file has since moved.
