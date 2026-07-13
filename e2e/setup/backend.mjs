import { spawn, spawnSync } from "node:child_process"
import { MEDUSA_DIR, assertLocalDatabaseUrl } from "./env.mjs"
import { preMigrateFixups, postMigrateFixups } from "./fixups.mjs"

// Spawned by Playwright's webServer with DATABASE_URL forced to the local
// docker Postgres. Medusa's loadEnv (dotenv) does NOT override env vars that
// are already set on the process, so this override beats apps/medusa/.env's
// production DATABASE_URL. global-setup additionally proves isolation before
// any test runs.
assertLocalDatabaseUrl()

preMigrateFixups()

console.log("[e2e] running medusa db:migrate against the LOCAL database...")
const migrate = spawnSync("pnpm", ["exec", "medusa", "db:migrate"], {
  cwd: MEDUSA_DIR,
  stdio: "inherit",
  env: process.env,
})
if (migrate.status !== 0) {
  console.error("[e2e] medusa db:migrate failed")
  process.exit(migrate.status ?? 1)
}

postMigrateFixups()

console.log("[e2e] starting medusa develop on :9000 (local DB)...")
const dev = spawn("pnpm", ["exec", "medusa", "develop"], {
  cwd: MEDUSA_DIR,
  stdio: "inherit",
  env: process.env,
})
dev.on("exit", (code) => process.exit(code ?? 0))
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => dev.kill(sig))
}
