import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const LOCAL_DB = "postgres://tamjams:tamjams@localhost:5432/tamjams"
export const BACKEND_URL = "http://localhost:9000"
export const STOREFRONT_URL = "http://localhost:8000"

export const E2E_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const REPO_ROOT = path.dirname(E2E_DIR)
export const MEDUSA_DIR = path.join(REPO_ROOT, "apps", "medusa")
export const STOREFRONT_DIR = path.join(REPO_ROOT, "apps", "storefront")

// The TamJams seeds hardcode the production sales-channel id (catalog-seed.ts /
// shipping-seed.ts). We pre-create a channel with that exact id locally so the
// seeds link cleanly on this DB.
export const HARDCODED_SALES_CHANNEL_ID = "sc_01KXCSZGBHJ9HXPEHKQYBCCXG1"

/** Run SQL against the LOCAL docker Postgres. Returns rows of |-separated fields. */
export function sql(query) {
  const out = execFileSync("psql", [LOCAL_DB, "-v", "ON_ERROR_STOP=1", "-Atc", query], {
    encoding: "utf8",
  })
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|"))
}

export function assertLocalDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? ""
  if (!url.includes("localhost:5432/tamjams") && !url.includes("127.0.0.1:5432/tamjams")) {
    console.error(
      `[e2e] REFUSING TO START: DATABASE_URL is not the local docker Postgres (${url || "unset"}).`
    )
    process.exit(1)
  }
}
