# TamJams Testing

Four layers, smallest-fastest to largest-slowest. **192 tests, all green as of 2026-07-14.**

**Hard safety rule: no test layer ever touches the Supabase production DB.** `apps/medusa/.env`'s `DATABASE_URL` points at production, so every runner is forced onto the local Docker Postgres and guarded: `apps/medusa/integration-tests/setup.js` hard-throws on any non-local DB host; `e2e/setup/backend.mjs` refuses a non-local `DATABASE_URL`. Do not weaken these guards.

Prereq for layers 2 and 4: local Docker Postgres up (`docker compose up -d` at repo root; user/pass `tamjams`, port 5432). Node 22 in every shell (`eval "$(fnm env)" && fnm use 22`).

## Layer 1 — Backend unit (Jest) — 17 tests, ~1s

```bash
cd apps/medusa && pnpm test:unit
```

`src/migration-scripts/__tests__/` — the deterministic seed logic via named exports on the script files: `skuFor` (`TJ-<FLAVOR>-<SIZE>`, all 21 combos unique), `imageUrlFor`, exactly 7 flavors with unique codes/handles, price table 14.89/22.89/33.89 ascending by oz, decimal-dollar guards (≤2 decimals, <100) on every price and the $5 shipping rate, `BRAND_STORY` prepended to every description.

## Layer 2 — Backend integration (Jest + @medusajs/test-utils) — 5 tests, ~10s

```bash
cd apps/medusa && pnpm test:integration:http
```

`integration-tests/http/store-flows.spec.ts`. `medusaIntegrationTestRunner` boots a real Medusa per suite on a **throwaway DB** it creates on the local instance (via the `pg-god` devDep — the starter omitted it; don't remove it). The runner does **not** run `src/migration-scripts`, so the suite invokes the seed exports directly in `beforeAll` (pre-creating the hardcoded sales channel + shipping profile a fresh DB lacks).

Covers: `tamjams-jar` with 21 variants at decimal-dollar prices and `TJ-*` SKUs; publishable-key scoping (no key → 400/401); US/usd region; full cart lifecycle (add → qty 2 → $29.78 → "Standard Shipping" $5 → manual payment → complete → order at $34.78); seed idempotency (second run of catalog+shipping seeds changes no counts — `initial-data-seed` is deliberately excluded: it's non-idempotent by design, second `createRegionsWorkflow` for `us` throws).

## Layer 3 — Storefront unit + component (Vitest + Testing Library) — 161 tests, ~2s

```bash
cd apps/storefront && pnpm test        # or test:watch
```

Config: `vitest.config.ts` (jsdom, tsconfig paths), `vitest.setup.ts` (jest-dom). Fixtures model the real 21-variant catalog (`src/lib/util/__tests__/fixtures.ts`).

- `src/lib/util/__tests__/tamjams.test.ts` (106): `parseConfig` (all 21 real configs + 11 invalid shapes), `buildConfig` round-trips, `slugifyFlavor` (all 7), `resolveVariant` (metadata match, option-value fallback, miss), `flavorsFromProduct`/`sizesFromProduct` ordering+dedup, full `isVariantInStock` matrix.
- Component `__tests__/` beside each component: `option-radio-group` (WAI-ARIA radiogroup, roving tabindex, arrow-key wrap, Space/Enter, disabled), `sticky-buy-bar` (aria-hidden/tabindex states), `nutrition-facts`, `product-image` (error → placeholder, reset on src change), `flavor-card` (localized `/shop/<slug>-<oz>oz` href).

## Layer 4 — E2E (Playwright) — 9 scenarios, ~40s warm

```bash
cd e2e && pnpm test                    # test:headed / report also available
```

Playwright's `webServer` orchestrates both servers itself (see `e2e/README.md`): backend forced onto the local Docker PG (migrate + seeds, env-override beats `.env`), storefront started with the **local** publishable key read from the local DB. `setup/fixups.mjs` pre-creates what the hardcoded-ID seeds assume (additive/idempotent only).

Scenarios: home 7-flavor grid with prices · card → shop page ($14.89) · size change updates price+URL without reload · **browser back restores prior config** (caught a real `router.replace` bug on first run; fixed to `router.push`) · keyboard-only radiogroup selection · Add to Bag → cart count/line item/qty totals · guest checkout to the manual-payment step (no order placed) · invalid config → 404 · sold-out state via psql inventory manipulation (restored after).

## CI

`.github/workflows/test.yml`: on push/PR — `storefront-unit` job (Layer 3) + `backend` job (Layers 1–2, Postgres 16 service container). E2E is local/on-demand (needs the two-server stack + browsers).

## Test-infra landmines (each cost debugging time)

- `pg-god` is required by the integration runner and missing from the stock starter.
- `jest.config.js` referenced `integration-tests/setup.js` that never existed — jest was broken from scaffold until 2026-07-14.
- Seeds hardcode the production sales-channel id → fresh DBs need it pre-created.
- `inventory_level.raw_stocked_quantity` (jsonb) is authoritative; SQL touching only `stocked_quantity` is invisible to Medusa.
- Publishable keys with >1 sales channel 400 on `+variants.inventory_quantity`.
- Next dev persists `force-cache` product fetches on disk across restarts (`.next/cache/fetch-cache` — E2E clears it).

## Open

- **Storefront type gate** (planned stretch, not done): `next.config.js` still sets `ignoreBuildErrors`/`ignoreDuringBuilds`, and repo-wide `tsc --noEmit` has React-19 false positives in starter files. A scoped tsconfig over TamJams-authored files is the likely shape.
- E2E in CI (needs the stack in a runner).
- `resolveVariant`'s size-option fallback is dead weight against seeded data ("Small/Medium/Large" → `parseInt` NaN); works only via `metadata.size_oz`.
