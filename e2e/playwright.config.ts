import { defineConfig } from "@playwright/test"
import { execSync } from "node:child_process"
import * as path from "node:path"

const LOCAL_DB = "postgres://tamjams:tamjams@localhost:5432/tamjams"
const BACKEND_URL = "http://localhost:9000"
const STOREFRONT_URL = "http://localhost:8000"

// Medusa requires Node < 25 and this machine's global node is 25, so both dev
// servers must run on fnm's Node 22. Resolve its bin dir once and prepend it
// to PATH for every spawned server (`#!/usr/bin/env node` shebangs pick it up).
function node22BinDir(): string {
  const out = execSync('fnm exec --using=22 node -p "process.execPath"', {
    encoding: "utf8",
  }).trim()
  const execPath = out.split("\n").pop()
  if (!execPath) throw new Error("Could not resolve Node 22 via fnm")
  return path.dirname(execPath)
}

const PATH_WITH_NODE22 = `${node22BinDir()}${path.delimiter}${process.env.PATH}`

export default defineConfig({
  testDir: "./tests",
  // The suite shares one backend + one dev-mode storefront and one test
  // mutates inventory, so it runs serially and in filename order.
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  globalSetup: "./global-setup",
  use: {
    baseURL: STOREFRONT_URL,
    trace: "on-first-retry",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      // Applies local-DB fixups, runs `medusa db:migrate` (schema + the three
      // run-once seed scripts), then `medusa develop`. DATABASE_URL set here
      // beats apps/medusa/.env (dotenv never overrides existing process env),
      // which is what keeps E2E off the production Supabase database.
      command: "node setup/backend.mjs",
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: true,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        PATH: PATH_WITH_NODE22,
        DATABASE_URL: LOCAL_DB,
        STORE_CORS: "http://localhost:8000",
        AUTH_CORS: "http://localhost:8000,http://localhost:9000",
        ADMIN_CORS: "http://localhost:9000",
      },
    },
    {
      // Waits for the backend + local publishable key, then `next dev` on
      // :8000 with backend URL / key / region forced into the env (Next.js
      // also never overrides pre-set env vars with .env.local values).
      // Probe /us/cart: it responds without fetching product data, so the
      // sold-out spec (which must run before the product is ever cached by
      // the dev server) stays deterministic.
      command: "node setup/storefront.mjs",
      url: `${STOREFRONT_URL}/us/cart`,
      reuseExistingServer: true,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        PATH: PATH_WITH_NODE22,
      },
    },
  ],
})
