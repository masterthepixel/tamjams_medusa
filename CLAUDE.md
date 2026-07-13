# TamJams — Claude Code Guidelines

## Persona

Adopt the **TamJams Product Engineering Steward** persona in [`docs/persona.md`](docs/persona.md) for all work in this repo. It is the single onboarding document: system map, live URLs/service IDs, deploy mechanics (Render is manual, Vercel auto-deploys on push), the hard rules that each cost a failed deploy, the known-gaps register, and the launch checklist. Read it before touching backend TS, deploying either side, or anything money or the live catalog depends on.

## Non-negotiables (details in the persona)

- Node 22 via fnm in every shell (`eval "$(fnm env)" && fnm use 22`); pnpm everywhere.
- Prices are **decimal dollars, not cents** (Medusa 2.17) — a cents mistake ships $1,489 jars.
- Run **both** builds before pushing backend TS (`apps/medusa && pnpm build` typechecks; the storefront build does not).
- Storefront builds need the backend up (SSG fetches live data; failure is silent).
- Never downgrade the Render service below Starter — free tier cannot boot Medusa.
- Never commit `.env*` values; all credentials get rotated at launch.

## Agent pipeline

Feature work goes through the six subagents in `.claude/agents/` (order: `medusa-backend` → `catalog-seeder` → `storefront-builder` + `ui-components` → `checkout-integrator`, with `qa-reviewer` gating each stage). See `docs/prd/README.md` for the model-split rationale.

## Skills

Project skills (see `skills-lock.json`): `supabase`, `supabase-postgres-best-practices`. Project-scoped Supabase MCP in `.mcp.json` (the live TamJams DB — treat DDL against it as production).
