import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Heading } from "@modules/common/components/ui"

const Hero = () => {
  return (
    <div className="relative h-[75vh] w-full border-b border-ui-border-base bg-ui-bg-subtle">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 p-6 text-center small:p-32">
        <span>
          <Heading
            level="h1"
            className="text-4xl font-normal leading-tight text-ui-fg-base small:text-5xl"
          >
            Tam&rsquo;s Jams
          </Heading>
          <Heading
            level="h2"
            className="mt-2 text-2xl font-normal leading-snug text-ui-fg-subtle"
          >
            Small-batch, real-fruit jams in seven flavors
          </Heading>
        </span>
        <p className="max-w-xl text-ui-fg-subtle">
          100% real fruit, pure cane sugar, no additives. Made with love from a
          family recipe.
        </p>
        <LocalizedClientLink href="/shop/strawberry-8oz">
          <Button variant="primary" className="h-12 px-6">
            Shop the flavors
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
