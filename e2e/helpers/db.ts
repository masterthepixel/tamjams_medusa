import { execFileSync } from "node:child_process"

export const LOCAL_DB = "postgres://tamjams:tamjams@localhost:5432/tamjams"
export const BACKEND_URL = "http://localhost:9000"

export function sql(query: string): string[][] {
  const out = execFileSync(
    "psql",
    [LOCAL_DB, "-v", "ON_ERROR_STOP=1", "-Atc", query],
    { encoding: "utf8" }
  )
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|"))
}

export function getPublishableKey(): string {
  const rows = sql(
    "SELECT token FROM api_key WHERE type = 'publishable' AND revoked_at IS NULL ORDER BY created_at ASC LIMIT 1"
  )
  const token = rows[0]?.[0]
  if (!token) throw new Error("No publishable API key in the local database")
  return token
}

export function getStockedQuantity(sku: string): number {
  const rows = sql(
    `SELECT il.stocked_quantity FROM inventory_level il
     JOIN inventory_item ii ON ii.id = il.inventory_item_id
     WHERE ii.sku = '${sku}' AND ii.deleted_at IS NULL`
  )
  const qty = rows[0]?.[0]
  if (qty === undefined) throw new Error(`No inventory level for SKU ${sku}`)
  return Number(qty)
}

export function setStockedQuantity(sku: string, quantity: number): void {
  // Medusa v2 hydrates BigNumber columns from the raw_* jsonb, not the numeric
  // column — updating only stocked_quantity leaves the API serving the old value.
  sql(
    `UPDATE inventory_level SET
       stocked_quantity = ${quantity},
       raw_stocked_quantity = '{"value": "${quantity}", "precision": 20}'::jsonb
     WHERE inventory_item_id IN (
       SELECT id FROM inventory_item WHERE sku = '${sku}' AND deleted_at IS NULL
     )`
  )
}
