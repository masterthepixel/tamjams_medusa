// Test DB isolation + hard safety guard.
//
// apps/medusa/.env's DATABASE_URL points at the PRODUCTION Supabase database.
// Tests must NEVER touch it. This file runs (jest `setupFiles`) in every worker
// BEFORE any test — including before medusaIntegrationTestRunner boots Medusa —
// so it is the single chokepoint that forces every runner onto the LOCAL Docker
// Postgres and refuses to run otherwise.
//
// How the integration runner picks its DB (verified against @medusajs/test-utils
// 2.17.2): it builds a throwaway-DB connection URL from DB_HOST / DB_PORT /
// DB_USERNAME / DB_PASSWORD (dist/database.js getDatabaseURL), creates/drops that
// throwaway DB via pg-god using the same superuser creds, and then OVERRIDES
// medusa-config's projectConfig.databaseUrl with it at boot
// (dist/medusa-test-runner-utils/config.js). So DATABASE_URL from .env is not
// used by the booted app — but we pin it to the local instance anyway as defense
// in depth, and hard-fail if anything still points at a remote/Supabase host.

const DB_HOST = "localhost";
const DB_PORT = "5432";
const DB_USERNAME = "tamjams";
const DB_PASSWORD = "tamjams";

// Local Docker Postgres (docker compose: user/pass/db all "tamjams", superuser,
// can create the runner's throwaway databases).
process.env.DB_HOST = DB_HOST;
process.env.DB_PORT = DB_PORT;
process.env.DB_USERNAME = DB_USERNAME;
process.env.DB_PASSWORD = DB_PASSWORD;
process.env.DATABASE_URL = `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/tamjams`;

// Keep tests hermetic: no Redis (Medusa v2 falls back to the in-memory event
// bus / workflow engine / cache when REDIS_URL is unset).
delete process.env.REDIS_URL;

// Deterministic CORS/secrets so config loading never depends on .env leaking in.
process.env.STORE_CORS = process.env.STORE_CORS || "http://localhost:8000";
process.env.ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:9000";
process.env.AUTH_CORS = process.env.AUTH_CORS || "http://localhost:9000";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test";
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || "test";

// Hard safety guard: refuse to run against anything that is not the local DB.
for (const key of ["DATABASE_URL", "DB_HOST"]) {
  const value = process.env[key] || "";
  const isLocal = /(^|@|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/.test(value) ||
    value === "localhost";
  const looksRemote = /supabase|pooler|amazonaws|render\.com|\.co($|\/)|\.com/i.test(
    value
  );
  if (!isLocal || looksRemote) {
    throw new Error(
      `[test-safety] Refusing to run: ${key}="${value}" is not the local Docker Postgres. ` +
        `Tests must never connect to the Supabase production database.`
    );
  }
}
