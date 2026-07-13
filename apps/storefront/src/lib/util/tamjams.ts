import { HttpTypes } from "@medusajs/types"

export const JAR_HANDLE = "tamjams-jar"

export type JamSize = {
  oz: number
  token: string // e.g. "8oz"
  label: string // e.g. "Small"
}

export type JamFlavor = {
  slug: string // e.g. "sour-cherry"
  name: string // e.g. "Sour Cherry"
  subtitle?: string
  image?: string
}

export const slugifyFlavor = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

/**
 * The shop route segment is `<flavor-slug>-<oz>oz` (e.g. `sour-cherry-18oz`).
 * The flavor slug may itself contain dashes, so we anchor on the `-<digits>oz` suffix.
 */
export const parseConfig = (
  config: string
): { flavorSlug: string; oz: number } | null => {
  const match = config.match(/^(.+)-(\d+)oz$/)
  if (!match) return null
  return { flavorSlug: match[1], oz: Number(match[2]) }
}

export const buildConfig = (flavorSlug: string, oz: number): string =>
  `${flavorSlug}-${oz}oz`

const variantFlavor = (v: HttpTypes.StoreProductVariant): string =>
  (v.metadata?.flavor as string | undefined) ??
  v.options?.find((o) => o.option?.title === "Flavor")?.value ??
  ""

const variantOz = (v: HttpTypes.StoreProductVariant): number => {
  const fromMeta = v.metadata?.size_oz
  if (fromMeta != null) return Number(fromMeta)
  const fromOption = v.options?.find((o) => o.option?.title === "Size")?.value
  return fromOption ? parseInt(fromOption, 10) : NaN
}

export const variantConfig = (v: HttpTypes.StoreProductVariant): string =>
  buildConfig(slugifyFlavor(variantFlavor(v)), variantOz(v))

export const resolveVariant = (
  product: HttpTypes.StoreProduct,
  flavorSlug: string,
  oz: number
): HttpTypes.StoreProductVariant | undefined =>
  product.variants?.find(
    (v) => slugifyFlavor(variantFlavor(v)) === flavorSlug && variantOz(v) === oz
  )

/** Distinct flavors in catalog order, keyed by slug. */
export const flavorsFromProduct = (
  product: HttpTypes.StoreProduct
): JamFlavor[] => {
  const seen = new Map<string, JamFlavor>()
  for (const v of product.variants ?? []) {
    const name = variantFlavor(v)
    const slug = slugifyFlavor(name)
    if (!slug || seen.has(slug)) continue
    seen.set(slug, {
      slug,
      name,
      subtitle: v.metadata?.subtitle as string | undefined,
      image: v.metadata?.image as string | undefined,
    })
  }
  return Array.from(seen.values())
}

/** Distinct sizes sorted ascending by ounces. */
export const sizesFromProduct = (product: HttpTypes.StoreProduct): JamSize[] => {
  const seen = new Map<number, JamSize>()
  for (const v of product.variants ?? []) {
    const oz = variantOz(v)
    if (Number.isNaN(oz) || seen.has(oz)) continue
    const label =
      v.options?.find((o) => o.option?.title === "Size")?.value ?? `${oz}oz`
    seen.set(oz, { oz, token: `${oz}oz`, label })
  }
  return Array.from(seen.values()).sort((a, b) => a.oz - b.oz)
}

export const isVariantInStock = (
  v?: HttpTypes.StoreProductVariant
): boolean => {
  if (!v) return false
  if (!v.manage_inventory) return true
  if (v.allow_backorder) return true
  return (v.inventory_quantity ?? 0) > 0
}
