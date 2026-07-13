"use server"

import { HttpTypes } from "@medusajs/types"
import { JAR_HANDLE } from "@lib/util/tamjams"
import { listProducts } from "./products"

const JAR_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.options,*variants.options.option,*variants.images,+variants.metadata,+metadata,*images"

/**
 * Fetches the single TamJams Jar product (all 21 variants, priced for the
 * region) used by both the home flavor grid and the shop configurator.
 */
export const getJarProduct = async ({
  countryCode,
  regionId,
}: {
  countryCode?: string
  regionId?: string
}): Promise<HttpTypes.StoreProduct | null> => {
  const {
    response: { products },
  } = await listProducts({
    countryCode,
    regionId,
    queryParams: { handle: JAR_HANDLE, fields: JAR_FIELDS, limit: 1 },
  })

  return products[0] ?? null
}
