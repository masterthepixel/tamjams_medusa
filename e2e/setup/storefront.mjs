import { spawn } from "node:child_process"
import { rmSync } from "node:fs"
import path from "node:path"
import { BACKEND_URL, STOREFRONT_DIR, sql } from "./env.mjs"

// Waits for the backend's migrate+seed to have produced a publishable API key
// in the LOCAL database (the local key differs from production's), then starts
// `next dev` with the backend URL + key forced into the environment. Next.js
// does not override env vars that are already set, so these beat any values in
// apps/storefront/.env.local.

const DEADLINE = Date.now() + 4 * 60 * 1000

function readKey() {
  try {
    const rows = sql(
      "SELECT token FROM api_key WHERE type = 'publishable' AND revoked_at IS NULL ORDER BY created_at ASC LIMIT 1"
    )
    return rows[0]?.[0] ?? null
  } catch {
    return null
  }
}

let key = readKey()
while (!key && Date.now() < DEADLINE) {
  await new Promise((r) => setTimeout(r, 2000))
  key = readKey()
}
if (!key) {
  console.error("[e2e] no publishable key appeared in the local DB — backend migrate failed?")
  process.exit(1)
}

// Wait for the backend itself so the storefront middleware's first region
// fetch (which it caches in-memory) sees the US region.
let backendUp = false
while (!backendUp && Date.now() < DEADLINE) {
  try {
    const res = await fetch(`${BACKEND_URL}/health`)
    backendUp = res.ok
  } catch {}
  if (!backendUp) await new Promise((r) => setTimeout(r, 2000))
}
if (!backendUp) {
  console.error("[e2e] backend on :9000 never became healthy")
  process.exit(1)
}

// The storefront fetches products with `cache: "force-cache"` and the Next dev
// server persists that data cache on disk (.next/cache/fetch-cache) across
// restarts. Stale cached product data (prices, inventory) would defeat the
// sold-out scenario and mask seed changes, so clear the runtime fetch cache
// before starting. This touches only gitignored dev-server artifacts.
rmSync(path.join(STOREFRONT_DIR, ".next", "cache", "fetch-cache"), {
  recursive: true,
  force: true,
})

console.log(`[e2e] starting next dev on :8000 against ${BACKEND_URL} (key ${key.slice(0, 12)}…)`)
const dev = spawn("pnpm", ["dev"], {
  cwd: STOREFRONT_DIR,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: BACKEND_URL,
    MEDUSA_BACKEND_URL: BACKEND_URL,
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: key,
    NEXT_PUBLIC_DEFAULT_REGION: "us",
    NEXT_PUBLIC_BASE_URL: "http://localhost:8000",
  },
})
dev.on("exit", (code) => process.exit(code ?? 0))
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => dev.kill(sig))
}
