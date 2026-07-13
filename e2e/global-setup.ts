import { BACKEND_URL, getPublishableKey } from "./helpers/db"

/**
 * Proof of local-DB isolation, run after the web servers are up and before any
 * test: the publishable key is read straight from the LOCAL docker Postgres —
 * its token differs from the production key — and the running backend must
 * accept it and serve the seeded jar product. A backend accidentally connected
 * to production Supabase would reject this key (it does not exist there), so
 * the suite aborts instead of testing against production.
 */
export default async function globalSetup() {
  const key = getPublishableKey()

  const res = await fetch(
    `${BACKEND_URL}/store/products?handle=tamjams-jar&limit=1&fields=id,handle,*variants`,
    { headers: { "x-publishable-api-key": key } }
  )
  if (!res.ok) {
    throw new Error(
      `Local-DB isolation check FAILED: backend on :9000 rejected the local publishable key ` +
        `(HTTP ${res.status}). Is it connected to the local docker Postgres?`
    )
  }
  const body = (await res.json()) as { products: { handle: string; variants: unknown[] }[] }
  const product = body.products?.[0]
  if (!product || product.handle !== "tamjams-jar" || product.variants?.length !== 21) {
    throw new Error(
      `Local-DB isolation check FAILED: expected tamjams-jar with 21 variants, got ` +
        JSON.stringify({ handle: product?.handle, variants: product?.variants?.length })
    )
  }
  console.log(
    `[e2e] isolation check OK — backend serves tamjams-jar (21 variants) using the local-only key ${key.slice(0, 12)}…`
  )
}
