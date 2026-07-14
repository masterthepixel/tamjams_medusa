import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Heading } from "@modules/common/components/ui"

const Hero = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden border-b border-ui-border-base bg-ui-bg-subtle">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
      >
        <source
          src="https://tamsjams.com/wp-content/uploads/2026/05/tamjamsvideo.mp4"
          type="video/mp4"
        />
      </video>
      {/* Dark overlay for text legibility */}
      <div className="absolute inset-0 z-0 bg-black/40" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 p-6 text-center small:p-32">
        <span>
          <Heading
            level="h1"
            className="text-4xl font-normal leading-tight text-white drop-shadow-md small:text-5xl"
          >
            Tam&rsquo;s Jams
          </Heading>
          <Heading
            level="h2"
            className="mt-2 text-2xl font-normal leading-snug text-white/90 drop-shadow-md"
          >
            Small-batch, real-fruit jams in seven flavors
          </Heading>
        </span>
        <p className="max-w-xl text-lg text-white/90 drop-shadow-md">
          100% real fruit, pure cane sugar, no additives. Made with love from a
          family recipe.
        </p>
        <LocalizedClientLink href="/shop/strawberry-8oz">
          <Button variant="primary" className="h-12 px-6 shadow-lg transition-transform hover:-translate-y-1">
            Shop the flavors
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
