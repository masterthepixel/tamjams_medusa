import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { listRegions } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL()

  // Get all country codes
  const countryCodes = await listRegions().then((regions) =>
    regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
  )

  if (!countryCodes || countryCodes.length === 0) {
    return []
  }

  const sitemapEntries: MetadataRoute.Sitemap = []

  // Iterate over each supported country to generate localized routes
  for (const country of countryCodes) {
    if (!country) continue

    // Add static localized pages
    sitemapEntries.push({
      url: `${baseUrl}/${country}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    })

    sitemapEntries.push({
      url: `${baseUrl}/${country}/store`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    })

    // Fetch products for this country
    try {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle,updated_at" },
      })

      if (response.products) {
        for (const product of response.products) {
          if (!product.handle) continue
          
          sitemapEntries.push({
            url: `${baseUrl}/${country}/products/${product.handle}`,
            lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
            changeFrequency: "daily",
            priority: 0.8,
          })
        }
      }
    } catch (e) {
      console.error(`Failed to fetch products for sitemap for country ${country}`)
    }
  }

  return sitemapEntries
}
