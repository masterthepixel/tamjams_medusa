# TamJams — Claude Code subagents

Drop these into `.claude/agents/` at the root of the TamJams repo (create the folder if it doesn't exist). Claude Code auto-discovers them and delegates based on each agent's `description`, or you can invoke one explicitly ("use the catalog-seeder agent to…").

## The agents

| Agent | Model | Owns |
|-------|-------|------|
| `medusa-backend` | sonnet | Medusa config, modules, Stripe, regions, sales channels, migrations, product model |
| `catalog-seeder` | haiku | Seed scripts: product, options, variants, SKUs, prices, inventory |
| `storefront-builder` | sonnet | Home page + configurator shop page, routing, URL-as-state, SSR permutations |
| `ui-components` | haiku | Presentational components + Tailwind markup from specs |
| `checkout-integrator` | sonnet | Cart, Stripe checkout, order confirmation, emails |
| `qa-reviewer` | haiku | Typecheck/lint/build gates + diff review after each task |

**Model split rationale:** Haiku handles the cheap, well-specified, parallelizable work (seeding, presentational markup, verification gates); Sonnet handles the reasoning-heavy work (backend config, configurator logic, payment integration). Bump any Sonnet agent to `opus` for a genuinely gnarly task by editing its `model:` field.

## Typical build flow

1. `medusa-backend` — stand up Medusa, define the product model, region, sales channel, Stripe, publishable key.
2. `catalog-seeder` — seed the 7 flavors × 3 sizes once the model exists.
3. `storefront-builder` — build home + configurator pages against the Store API, delegating repetitive UI to `ui-components`.
4. `checkout-integrator` — wire cart + Stripe checkout once items can be added to a cart.
5. `qa-reviewer` — run after each of the above before marking work done.

## Notes

- These files set project conventions (pnpm, no explanatory comments, edit-over-create, validate only at boundaries) so subagents inherit them without repeating your global CLAUDE.md.
- `tools:` is restricted on the narrow agents and omitted (inherit-all) on the complex ones.
- Deployment target baked into the agents' assumptions: storefront on Vercel, Postgres on Supabase, Redis on Upstash, Medusa server on Railway/Render/Fly (not Vercel).
- Pin Node 22 for the repo (`.node-version`) — Medusa's storefront requires Node < 25.
