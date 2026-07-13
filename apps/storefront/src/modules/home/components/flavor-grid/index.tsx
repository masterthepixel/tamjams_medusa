import { getJarProduct } from "@lib/data/tamjams"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  flavorsFromProduct,
  resolveVariant,
  sizesFromProduct,
} from "@lib/util/tamjams"
import FlavorCard from "@modules/home/components/flavor-card"

/**
 * Live flavor showcase. Pulls the 7 flavors from the Store API and links each
 * to its shop URL with the smallest size preselected. Prices are read from the
 * variant, never hardcoded.
 */
export default async function FlavorGrid({
  countryCode,
}: {
  countryCode: string
}) {
  const product = await getJarProduct({ countryCode })

  if (!product) {
    return null
  }

  const flavors = flavorsFromProduct(product)
  const sizes = sizesFromProduct(product)
  const defaultSize = sizes[0]

  if (!flavors.length || !defaultSize) {
    return null
  }

  return (
    <section className="content-container py-16" data-testid="flavor-grid">
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-ui-fg-base">
          Seven small-batch flavors
        </h2>
        <p className="text-ui-fg-subtle">
          100% real fruit and pure cane sugar. Pick a flavor to build your jar.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 small:grid-cols-3 medium:grid-cols-4">
        {flavors.map((flavor) => {
          const variant = resolveVariant(product, flavor.slug, defaultSize.oz)
          const { variantPrice } = getProductPrice({
            product,
            variantId: variant?.id,
          })
          return (
            <li key={flavor.slug}>
              <FlavorCard
                name={flavor.name}
                subtitle={flavor.subtitle}
                image={flavor.image}
                href={`/shop/${flavor.slug}-${defaultSize.oz}oz`}
                price={variantPrice?.calculated_price}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
