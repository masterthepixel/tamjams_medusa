import { HttpTypes } from "@medusajs/types"

/**
 * Mirrors the real seeded catalog (apps/medusa/src/migration-scripts/catalog-seed.ts):
 * 7 flavors x 3 sizes = 21 variants, variant metadata carrying flavor/size_oz/
 * subtitle/image, and Flavor/Size option values.
 */

export type FlavorFixture = {
  code: string
  name: string
  handle: string
  slug: string
  subtitle: string
}

export type SizeFixture = {
  code: string
  title: string
  oz: number
  grams: number
  priceUsd: number
}

export const FLAVOR_FIXTURES: FlavorFixture[] = [
  {
    code: "APRICOT",
    name: "Apricot",
    handle: "apricot-jam",
    slug: "apricot",
    subtitle: "Golden apricot jam with warm, sunny flavor",
  },
  {
    code: "STRAW",
    name: "Strawberry",
    handle: "strawberry-jam",
    slug: "strawberry",
    subtitle: "Bright strawberry jam with fresh, sweet taste",
  },
  {
    code: "BLUE",
    name: "Blueberry",
    handle: "blueberry-jam",
    slug: "blueberry",
    subtitle: "Deep blueberry jam with rich, fruity notes",
  },
  {
    code: "RASP",
    name: "Raspberry",
    handle: "raspberry-jam",
    slug: "raspberry",
    subtitle: "Tart raspberry jam with vibrant, tangy flavor",
  },
  {
    code: "APPLE",
    name: "Apple",
    handle: "apple-jam",
    slug: "apple",
    subtitle: "Classic apple jam with smooth, mellow sweetness",
  },
  {
    code: "QUINCE",
    name: "Quince",
    handle: "quince-jam",
    slug: "quince",
    subtitle: "Aromatic quince jam with warm spiced notes",
  },
  {
    code: "SRCHERRY",
    name: "Sour Cherry",
    handle: "sour-cherry-jam",
    slug: "sour-cherry",
    subtitle: "Tart sour cherry jam with bright, complex flavor",
  },
]

export const SIZE_FIXTURES: SizeFixture[] = [
  { code: "SMALL", title: "Small", oz: 8, grams: 227, priceUsd: 14.89 },
  { code: "MEDIUM", title: "Medium", oz: 12, grams: 340, priceUsd: 22.89 },
  { code: "LARGE", title: "Large", oz: 18, grams: 510, priceUsd: 33.89 },
]

export const ALL_CONFIGS = FLAVOR_FIXTURES.flatMap((flavor) =>
  SIZE_FIXTURES.map((size) => ({
    flavor,
    size,
    config: `${flavor.slug}-${size.oz}oz`,
  }))
)

export const makeVariant = (
  flavor: FlavorFixture,
  size: SizeFixture,
  overrides: Record<string, unknown> = {}
): HttpTypes.StoreProductVariant =>
  ({
    id: `variant_${flavor.code}_${size.code}`,
    title: `${flavor.name} - ${size.title}`,
    sku: `TJ-${flavor.code}-${size.code}`,
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 100,
    options: [
      {
        id: `optval_flavor_${flavor.code}`,
        value: flavor.name,
        option: { id: "opt_flavor", title: "Flavor" },
      },
      {
        id: `optval_size_${size.code}`,
        value: size.title,
        option: { id: "opt_size", title: "Size" },
      },
    ],
    metadata: {
      flavor: flavor.name,
      size_oz: size.oz,
      subtitle: flavor.subtitle,
      image: `/images/products/${flavor.handle}.jpg`,
    },
    calculated_price: {
      calculated_amount: size.priceUsd,
      currency_code: "usd",
    },
    ...overrides,
  } as unknown as HttpTypes.StoreProductVariant)

export const makeJarProduct = (
  variants?: HttpTypes.StoreProductVariant[]
): HttpTypes.StoreProduct =>
  ({
    id: "prod_tamjams",
    handle: "tamjams-jar",
    title: "TamJams Jar",
    variants:
      variants ??
      ALL_CONFIGS.map(({ flavor, size }) => makeVariant(flavor, size)),
  } as unknown as HttpTypes.StoreProduct)
