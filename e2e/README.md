# TamJams E2E (Playwright)

Layer 4 of [`docs/TESTING.md`](../docs/TESTING.md): full-stack browser tests for the
home page, jam configurator, cart, and checkout — **always against the local
docker Postgres, never Supabase production**.

## Run

```bash
eval "$(fnm env)" && fnm use 22   # Medusa needs Node < 25
docker compose up -d              # repo root: Postgres :5432 + Redis :6389
cd e2e
pnpm test
```

Playwright orchestrates the whole stack via the `webServer` array in
`playwright.config.ts` (both entries `reuseExistingServer: true`, so already-
running local servers on :9000/:8000 are reused, and servers Playwright starts
are stopped when the run ends):

1. **Backend** — `setup/backend.mjs`: applies local-DB fixups (below), runs
   `medusa db:migrate` (schema + the three run-once seed scripts), then
   `medusa develop` on :9000. `DATABASE_URL` is forced to
   `postgres://tamjams:tamjams@localhost:5432/tamjams` on the spawned process;
   Medusa's `loadEnv` (dotenv) never overrides pre-set env vars, so this beats
   the production `DATABASE_URL` in `apps/medusa/.env`. The script refuses to
   start if `DATABASE_URL` is not the local docker DB.
2. **Storefront** — `setup/storefront.mjs`: waits for the backend and for a
   publishable key to exist in the *local* DB (it differs from production's),
   then `next dev` on :8000 with `NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000`,
   the local key, and `NEXT_PUBLIC_DEFAULT_REGION=us` forced into the env
   (Next.js also never overrides pre-set env with `.env.local`).

`global-setup.ts` then **proves isolation** before any test runs: it reads the
publishable key straight from the local Postgres and requires the running
backend to accept it and serve `tamjams-jar` with 21 variants. A backend
accidentally connected to production would reject that key (it only exists
locally), aborting the suite.

Node 22 is resolved through `fnm` at config-load time and prepended to `PATH`
for both servers, so the suite works even when invoked from global Node 25.

## Local-DB fixups (`setup/fixups.mjs`)

The repo's seed scripts were written against production and don't stand up a
complete store on any other DB, so `backend.mjs` applies additive-only,
idempotent SQL:

- **Pre-migrate**: creates the sales channel with the id that
  `catalog-seed.ts`/`shipping-seed.ts` **hardcode**
  (`sc_01KXCSZGBHJ9HXPEHKQYBCCXG1` — a production id that exists nowhere
  else). Without this, a fresh/foreign DB seeds a catalog linked to a
  nonexistent channel.
- **Post-migrate**: links the jar product and the TamJams Warehouse to every
  sales channel (keys must keep exactly one channel each —
  `+variants.inventory_quantity` 400s on multi-channel keys); creates the
  US/USD region with `pp_system_default`; creates the US fulfillment set /
  service zone / flat **$5.00 “Standard Shipping”** option. The last one is
  needed because this machine's local DB also carries the Medusa demo seed,
  whose European shipping options make `shipping-seed.ts` short-circuit
  before creating the US option.

Nothing is deleted or updated (except assigning the previously-unassigned `us`
row in `region_country`), and every statement is guarded, so re-runs are no-ops.

## Scenario map (TESTING.md Layer 4)

| # | Scenario | Spec |
|---|----------|------|
| 1 | Home renders 7 flavor cards with prices | `tests/02-home.spec.ts` |
| 2 | Flavor card → `/us/shop/<slug>-8oz` with title + $14.89 | `tests/03-configurator.spec.ts` |
| 3 | Size change updates price + URL without reload | `tests/03-configurator.spec.ts` |
| 4 | Browser back restores previous config | `tests/03-configurator.spec.ts` — **test.fixme**, see below |
| 5 | Keyboard-only radiogroup selection | `tests/03-configurator.spec.ts` |
| 6 | Add to Bag → nav count, cart line item, qty totals | `tests/04-cart.spec.ts` |
| 7 | Guest checkout → $5.00 Standard Shipping → payment step | `tests/05-checkout.spec.ts` |
| 8 | Invalid config 404s | `tests/06-not-found.spec.ts` |
| 9 | Sold-out variant state (psql-manipulated inventory) | `tests/01-sold-out.spec.ts` |

## Known fixme: scenario 4 (browser back)

TESTING.md — and the jam-configurator's own doc comment — say the browser back
button restores the previous configuration. It does not: option selection uses
`router.replace(...)` (apps/storefront/src/modules/products/components/jam-configurator/index.tsx),
which replaces the current history entry rather than pushing one. Verified
against the running app: after 8oz → 12oz, `goBack()` never returns to the 8oz
URL. The spec is checked in as `test.fixme` with the expected assertions;
un-fixme it once the configurator pushes history entries (app change, outside
this suite's territory).

## Why the sold-out spec runs FIRST

`src/lib/data/products.ts` fetches the product with `cache: "force-cache"`, and
the Next dev server keeps that data cached **for the life of the process** — DB
inventory changes are invisible afterwards. So `01-sold-out.spec.ts` zeroes
`TJ-QUINCE-SMALL` (via psql, both `stocked_quantity` and Medusa's authoritative
`raw_stocked_quantity` jsonb) *before the dev server has ever fetched the
product*, asserts the disabled/Sold-out UI, and restores the inventory in a
`finally`. No other spec visits `quince-8oz`, so the stale cached quince-small
quantity can't affect them. If the storefront server is *reused* from a
previous session (product already cached in-stock), the spec detects that and
skips with an explanation — restart :8000 to exercise it.
