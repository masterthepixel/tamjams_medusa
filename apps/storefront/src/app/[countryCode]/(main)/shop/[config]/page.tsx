import { getBaseURL } from "@lib/util/env"
import {
  flavorsFromProduct,
  parseConfig,
  resolveVariant,
  variantConfig,
} from "@lib/util/tamjams"
import { getJarProduct } from "@lib/data/tamjams"
import { getRegion, listRegions } from "@lib/data/regions"
import NutritionFacts, {
  NutritionData,
} from "@modules/products/components/nutrition-facts"
import JamConfigurator from "@modules/products/components/jam-configurator"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ countryCode: string; config: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes?.length) {
      return []
    }

    const perCountry = await Promise.all(
      countryCodes.filter(Boolean).map(async (country) => {
        const product = await getJarProduct({ countryCode: country })
        const configs = (product?.variants ?? []).map(variantConfig)
        return configs.map((config) => ({
          countryCode: country as string,
          config,
        }))
      })
    )

    return perCountry.flat()
  } catch (error) {
    console.error(
      `Failed to generate static params for shop pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode, config } = await props.params
  const parsed = parseConfig(config)
  if (!parsed) notFound()

  const product = await getJarProduct({ countryCode })
  if (!product) notFound()

  const variant = resolveVariant(product, parsed.flavorSlug, parsed.oz)
  if (!variant) notFound()

  const flavorName = (variant.metadata?.flavor as string) ?? product.title
  const sizeLabel =
    variant.options?.find((o) => o.option?.title === "Size")?.value ??
    `${parsed.oz} oz`
  const title = `${flavorName} Jam — ${sizeLabel} | Tam's Jams`
  const description =
    (variant.metadata?.subtitle as string) ??
    `${flavorName} jam, ${sizeLabel}.`
  const image = variant.metadata?.image as string | undefined

  return {
    title,
    description,
    alternates: {
      canonical: `${getBaseURL()}/${countryCode}/products/${parsed.flavorSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `${getBaseURL()}/${countryCode}/shop/${config}`,
      images: image ? [{ url: image }] : [],
    },
  }
}

export default async function ShopConfigPage(props: Props) {
  const { countryCode, config } = await props.params

  const parsed = parseConfig(config)
  if (!parsed) notFound()

  const region = await getRegion(countryCode)
  if (!region) notFound()

  const product = await getJarProduct({ countryCode })
  if (!product) notFound()

  const variant = resolveVariant(product, parsed.flavorSlug, parsed.oz)
  if (!variant) notFound()

  const flavors = flavorsFromProduct(product)
  const flavorName = (variant.metadata?.flavor as string) ?? product.title
  const nutrition = variant.metadata?.nutrition as NutritionData | undefined
  const highlights = (variant.metadata?.highlights as string[]) ?? []
  const ingredients = variant.metadata?.ingredients as string | undefined
  const netWeight = variant.metadata?.net_weight as string | undefined
  const storage = variant.metadata?.storage as string | undefined
  const description = (variant.metadata?.description as string) ?? ""

  return (
    <div className="content-container py-8 pb-28">
      <nav className="mb-6 text-sm text-ui-fg-subtle" aria-label="Breadcrumb">
        <LocalizedClientLink href="/" className="hover:text-ui-fg-base">
          Home
        </LocalizedClientLink>
        <span className="mx-2">/</span>
        <span className="text-ui-fg-base">{flavorName} Jam</span>
      </nav>

      <JamConfigurator
        product={product}
        flavorSlug={parsed.flavorSlug}
        oz={parsed.oz}
        countryCode={countryCode}
      />

      {highlights.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-2" data-testid="highlights">
          {highlights.map((h) => (
            <li
              key={h}
              className="rounded-full border border-ui-border-base bg-ui-bg-subtle px-3 py-1 text-sm text-ui-fg-subtle"
            >
              {h}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12 flex flex-col gap-12 small:flex-row">
        <div className="small:w-2/3">
          <h2 className="mb-3 text-xl font-semibold text-ui-fg-base">
            About this flavor
          </h2>
          <div className="flex flex-col gap-4 whitespace-pre-line text-ui-fg-subtle">
            {description}
          </div>
          <dl className="mt-10 grid grid-cols-1 gap-4 small:grid-cols-2">
            {ingredients && (
              <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                <dt className="mb-2 text-xs font-bold uppercase tracking-wider text-ui-fg-base">
                  Ingredients
                </dt>
                <dd className="text-sm leading-relaxed text-ui-fg-subtle">{ingredients}</dd>
              </div>
            )}
            {netWeight && (
              <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                <dt className="mb-2 text-xs font-bold uppercase tracking-wider text-ui-fg-base">
                  Net weight
                </dt>
                <dd className="text-sm leading-relaxed text-ui-fg-subtle">{netWeight}</dd>
              </div>
            )}
            {storage && (
              <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                <dt className="mb-2 text-xs font-bold uppercase tracking-wider text-ui-fg-base">
                  Storage
                </dt>
                <dd className="text-sm leading-relaxed text-ui-fg-subtle">{storage}</dd>
              </div>
            )}
          </dl>
        </div>
        {nutrition && (
          <div className="small:w-1/3">
            <NutritionFacts nutrition={nutrition} />
          </div>
        )}
      </div>

      <div className="mt-16">
        <h2 className="mb-4 text-xl font-semibold text-ui-fg-base">
          More flavors
        </h2>
        <ul className="flex flex-wrap gap-3">
          {flavors
            .filter((f) => f.slug !== parsed.flavorSlug)
            .map((f) => (
              <li key={f.slug}>
                <LocalizedClientLink
                  href={`/shop/${f.slug}-${parsed.oz}oz`}
                  className="rounded-full border border-ui-border-base px-4 py-2 text-sm text-ui-fg-base hover:bg-ui-bg-subtle"
                >
                  {f.name}
                </LocalizedClientLink>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
