import { Metadata } from "next"

import { getRegion } from "@lib/data/regions"
import FlavorGrid from "@modules/home/components/flavor-grid"
import Hero from "@modules/home/components/hero"

export const metadata: Metadata = {
  title: "Tam's Jams — Small-batch, real-fruit jams",
  description:
    "Handmade small-batch jams in seven flavors and three sizes. 100% real fruit, pure cane sugar, no additives.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <>
      <Hero />
      <FlavorGrid countryCode={countryCode} />
      <section className="border-t border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container flex flex-col gap-4 py-16 small:max-w-3xl">
          <h2 className="text-2xl font-semibold text-ui-fg-base">
            A story of sweet beginnings
          </h2>
          <p className="text-ui-fg-subtle">
            Tam&rsquo;s Jams was born from the heart of Tamara, an Armenian
            immigrant who came to America chasing a creative dream. Life had
            other plans — raising a large family came first — but her creativity
            never faded. She simply traded fabric and thread for fruit and
            flavor.
          </p>
          <p className="text-ui-fg-subtle">
            Every jar is made in small batches with 100% real fruit and pure
            cane sugar — no artificial flavors, no preservatives, no additives.
            A celebration of family, heritage, and the sweetness of second
            chances.
          </p>
        </div>
      </section>
    </>
  )
}
