import { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"

import {
  buildConfig,
  flavorsFromProduct,
  isVariantInStock,
  parseConfig,
  resolveVariant,
  sizesFromProduct,
  slugifyFlavor,
  variantConfig,
} from "@lib/util/tamjams"
import {
  ALL_CONFIGS,
  FLAVOR_FIXTURES,
  SIZE_FIXTURES,
  makeJarProduct,
  makeVariant,
} from "./fixtures"

describe("parseConfig", () => {
  it("parses a single-word flavor config", () => {
    expect(parseConfig("strawberry-8oz")).toEqual({
      flavorSlug: "strawberry",
      oz: 8,
    })
  })

  it("parses a dashed flavor slug by anchoring on the -<digits>oz suffix", () => {
    expect(parseConfig("sour-cherry-18oz")).toEqual({
      flavorSlug: "sour-cherry",
      oz: 18,
    })
  })

  it("parses multi-digit ounce values", () => {
    expect(parseConfig("apple-12oz")).toEqual({ flavorSlug: "apple", oz: 12 })
    expect(parseConfig("apple-100oz")).toEqual({ flavorSlug: "apple", oz: 100 })
  })

  it("parses a leading-zero ounce token numerically", () => {
    expect(parseConfig("apple-08oz")).toEqual({ flavorSlug: "apple", oz: 8 })
  })

  it.each(ALL_CONFIGS)(
    "parses the real catalog config $config",
    ({ flavor, size, config }) => {
      expect(parseConfig(config)).toEqual({
        flavorSlug: flavor.slug,
        oz: size.oz,
      })
    }
  )

  it.each([
    ["strawberry"],
    ["strawberry-oz"],
    ["8oz"],
    ["strawberry-8ozz"],
    [""],
    ["-8oz"],
    ["strawberry-8oz-extra"],
    ["strawberry-8OZ"],
    ["not-a-jam"],
    ["oz-oz-oz"],
    ["!!@@##"],
  ])("returns null for invalid config %j", (config) => {
    expect(parseConfig(config)).toBeNull()
  })
})

describe("buildConfig", () => {
  it("joins slug and oz with the oz suffix", () => {
    expect(buildConfig("sour-cherry", 18)).toBe("sour-cherry-18oz")
  })

  it.each(ALL_CONFIGS)(
    "round-trips through parseConfig for $config",
    ({ flavor, size, config }) => {
      expect(buildConfig(flavor.slug, size.oz)).toBe(config)
      expect(parseConfig(buildConfig(flavor.slug, size.oz))).toEqual({
        flavorSlug: flavor.slug,
        oz: size.oz,
      })
    }
  )
})

describe("slugifyFlavor", () => {
  it.each(FLAVOR_FIXTURES)("slugifies $name to $slug", ({ name, slug }) => {
    expect(slugifyFlavor(name)).toBe(slug)
  })

  it("trims and collapses non-alphanumeric runs", () => {
    expect(slugifyFlavor("  Sour   Cherry  ")).toBe("sour-cherry")
    expect(slugifyFlavor("Sour & Cherry!")).toBe("sour-cherry")
  })

  it("strips leading and trailing separators", () => {
    expect(slugifyFlavor("-Apricot-")).toBe("apricot")
  })
})

describe("resolveVariant", () => {
  const product = makeJarProduct()

  it.each(ALL_CONFIGS)(
    "matches $config via metadata flavor + size_oz",
    ({ flavor, size }) => {
      const variant = resolveVariant(product, flavor.slug, size.oz)
      expect(variant?.sku).toBe(`TJ-${flavor.code}-${size.code}`)
    }
  )

  it("falls back to option values when metadata is missing", () => {
    const optionOnly = {
      id: "variant_no_meta",
      sku: "TJ-STRAW-SMALL",
      metadata: null,
      options: [
        { id: "ov1", value: "Strawberry", option: { id: "o1", title: "Flavor" } },
        { id: "ov2", value: "8oz", option: { id: "o2", title: "Size" } },
      ],
    } as unknown as HttpTypes.StoreProductVariant
    const bareProduct = makeJarProduct([optionOnly])

    expect(resolveVariant(bareProduct, "strawberry", 8)?.id).toBe(
      "variant_no_meta"
    )
  })

  it("returns undefined for an unknown flavor", () => {
    expect(resolveVariant(product, "mango", 8)).toBeUndefined()
  })

  it("returns undefined for an unknown size", () => {
    expect(resolveVariant(product, "strawberry", 99)).toBeUndefined()
  })

  it("returns undefined when the product has no variants", () => {
    expect(
      resolveVariant(makeJarProduct([]), "strawberry", 8)
    ).toBeUndefined()
  })
})

describe("variantConfig", () => {
  it.each(ALL_CONFIGS)(
    "builds $config back from the variant",
    ({ flavor, size, config }) => {
      expect(variantConfig(makeVariant(flavor, size))).toBe(config)
    }
  )
})

describe("flavorsFromProduct", () => {
  it("dedups the 21 variants down to 7 flavors keyed by slug", () => {
    const flavors = flavorsFromProduct(makeJarProduct())
    expect(flavors).toHaveLength(7)
    expect(flavors.map((f) => f.slug)).toEqual(
      FLAVOR_FIXTURES.map((f) => f.slug)
    )
  })

  it("preserves catalog order and carries name, subtitle, and image", () => {
    const flavors = flavorsFromProduct(makeJarProduct())
    expect(flavors.map((f) => f.name)).toEqual(
      FLAVOR_FIXTURES.map((f) => f.name)
    )
    const sourCherry = flavors.find((f) => f.slug === "sour-cherry")
    expect(sourCherry).toMatchObject({
      name: "Sour Cherry",
      subtitle: "Tart sour cherry jam with bright, complex flavor",
      image: "/images/products/sour-cherry-jam.jpg",
    })
  })

  it("ignores variants without a flavor", () => {
    const noFlavor = {
      id: "variant_blank",
      metadata: {},
      options: [],
    } as unknown as HttpTypes.StoreProductVariant
    const flavors = flavorsFromProduct(
      makeJarProduct([
        noFlavor,
        makeVariant(FLAVOR_FIXTURES[0], SIZE_FIXTURES[0]),
      ])
    )
    expect(flavors.map((f) => f.slug)).toEqual(["apricot"])
  })

  it("returns an empty list for a product without variants", () => {
    expect(flavorsFromProduct(makeJarProduct([]))).toEqual([])
  })
})

describe("sizesFromProduct", () => {
  it("returns the 3 distinct sizes ascending by ounces", () => {
    const sizes = sizesFromProduct(makeJarProduct())
    expect(sizes.map((s) => s.oz)).toEqual([8, 12, 18])
    expect(sizes.map((s) => s.token)).toEqual(["8oz", "12oz", "18oz"])
    expect(sizes.map((s) => s.label)).toEqual(["Small", "Medium", "Large"])
  })

  it("sorts ascending even when variants arrive out of order", () => {
    const shuffled = [
      makeVariant(FLAVOR_FIXTURES[0], SIZE_FIXTURES[2]),
      makeVariant(FLAVOR_FIXTURES[0], SIZE_FIXTURES[0]),
      makeVariant(FLAVOR_FIXTURES[0], SIZE_FIXTURES[1]),
    ]
    expect(
      sizesFromProduct(makeJarProduct(shuffled)).map((s) => s.oz)
    ).toEqual([8, 12, 18])
  })

  it("skips variants whose size cannot be determined", () => {
    const sizeless = {
      id: "variant_sizeless",
      metadata: { flavor: "Apricot" },
      options: [],
    } as unknown as HttpTypes.StoreProductVariant
    const sizes = sizesFromProduct(
      makeJarProduct([sizeless, makeVariant(FLAVOR_FIXTURES[0], SIZE_FIXTURES[0])])
    )
    expect(sizes.map((s) => s.oz)).toEqual([8])
  })
})

describe("isVariantInStock", () => {
  const stockVariant = (overrides: Record<string, unknown>) =>
    makeVariant(FLAVOR_FIXTURES[0], SIZE_FIXTURES[0], overrides)

  it("returns false for undefined", () => {
    expect(isVariantInStock(undefined)).toBe(false)
  })

  it("returns true when inventory is not managed, even at zero quantity", () => {
    expect(
      isVariantInStock(
        stockVariant({ manage_inventory: false, inventory_quantity: 0 })
      )
    ).toBe(true)
  })

  it("returns true when backorder is allowed, even at zero quantity", () => {
    expect(
      isVariantInStock(
        stockVariant({
          manage_inventory: true,
          allow_backorder: true,
          inventory_quantity: 0,
        })
      )
    ).toBe(true)
  })

  it("returns true when managed with positive quantity", () => {
    expect(
      isVariantInStock(
        stockVariant({
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: 1,
        })
      )
    ).toBe(true)
  })

  it("returns false when managed with zero quantity", () => {
    expect(
      isVariantInStock(
        stockVariant({
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: 0,
        })
      )
    ).toBe(false)
  })

  it("returns false when managed with negative quantity", () => {
    expect(
      isVariantInStock(
        stockVariant({
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: -3,
        })
      )
    ).toBe(false)
  })

  it("treats a missing quantity as zero", () => {
    expect(
      isVariantInStock(
        stockVariant({
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: undefined,
        })
      )
    ).toBe(false)
  })
})
