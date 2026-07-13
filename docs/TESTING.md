# TamJams Testing Plan

Four layers, smallest-fastest to largest-slowest. **Hard safety rule: no test layer ever touches the Supabase production DB** — `apps/medusa/.env`'s `DATABASE_URL` points at production, so every test runner is forced onto the local Docker Postgres (`postgres://tamjams:tamjams@localhost:5432/…`) or a throwaway DB it creates itself.

## Layer 1 — Backend unit (Jest, exists in starter)

`apps/medusa`, `pnpm test:unit` (`TEST_TYPE=unit`). Targets the deterministic logic inside the migration-scripts (SKU generation, image paths, flavor/size tables, idempotency-guard predicates) via named exports added to the script files — **no behavior changes, no file renames** (renames would re-trigger run-once tracking).

## Layer 2 — Backend integration (Jest + @medusajs/test-utils, exists in starter)

`apps/medusa`, `pnpm test:integration:http` / `test:integration:modules` (`medusaIntegrationTestRunner` boots a real Medusa against a throwaway Postgres it creates on the local Docker instance). The highest-value backend layer:

- Store API: `tamjams-jar` product exists, 21 variants, correct decimal-dollar prices (14.89/22.89/33.89), publishable-key scoping (no key → 401/400).
- Region/sales-channel wiring: US region, usd, `pp_system_default`.
- Cart lifecycle: create → add variant by SKU → update qty → shipping option ("Standard Shipping" $5) → complete with manual provider → order exists with correct totals.
- Seed idempotency: run seeds twice → identical counts (1 product, 21 variants, 21 prices, 21 inventory levels, 1 shipping option).

## Layer 3 — Storefront unit + component (Vitest + Testing Library, new)

`apps/storefront`, `pnpm test` (jsdom). No network, no backend.

- **Unit — `src/lib/util/tamjams.ts` exhaustively**: `parseConfig` (valid, dashed slugs like `sour-cherry-18oz`, invalid shapes, missing-oz, digits edge cases), `buildConfig` round-trips, `slugifyFlavor`, `resolveVariant` (metadata match, option-value fallbacks, miss → undefined), `flavorsFromProduct` (dedup, catalog order), `sizesFromProduct` (oz ascending), `isVariantInStock` matrix (manage_inventory × allow_backorder × quantity).
- **Component (RTL)**: `option-radio-group` (radiogroup semantics, roving tabindex, arrow-key wrap, Space/Enter select, disabled options unselectable), `sticky-buy-bar` (visible/hidden aria + tabIndex), `nutrition-facts` (renders provided data), `product-image` (error → placeholder fallback, reset on src change), `flavor-card` (name/price/link).

## Layer 4 — E2E (Playwright, new `e2e/` workspace package)

Full local stack: backend on Docker Postgres (freshly migrated+seeded, NOT Supabase) + storefront against it. Scenarios:

1. Home renders 7 flavor cards with prices from the API.
2. Flavor card → correct `/us/shop/<slug>-8oz` page (title, price).
3. Configurator: size change updates price + URL without reload; flavor change updates image/copy.
4. Browser back restores the previous configuration.
5. Keyboard-only option selection (arrow keys) works.
6. Add to Bag → nav cart count increments; cart page shows line item; qty edit updates totals.
7. Checkout: guest email + address → shipping shows "Standard Shipping $5.00" → manual payment step reachable.
8. Invalid config (`/us/shop/not-a-jam-99oz`) → 404.
9. Sold-out state renders when a variant is out of stock (via API-manipulated inventory, if practical).

## Type gate (stretch)

The storefront currently has **no** type gate (`ignoreBuildErrors: true`). If a scoped `tsc` run over TamJams-authored files only can pass cleanly (starter files have React-19 false positives), add it as `pnpm typecheck`; otherwise document why not.

## CI

GitHub Actions: job 1 = storefront unit/component (no services); job 2 = backend unit + integration (Postgres service container); E2E stays local/on-demand initially (needs full stack + browsers).

## Ownership map (parallel implementation, disjoint territories)

| Territory | Agent | Files |
|---|---|---|
| `apps/medusa` tests | A | jest config touch-ups, `src/**/__tests__/`, `integration-tests/` |
| `apps/storefront` tests | B | `vitest.config.ts`, `src/**/__tests__/` |
| `e2e/` package | C | everything under `e2e/` |
| Shared deps/lockfile, CI, docs | orchestrator | one setup commit before agents run; CI + persona updates after |
