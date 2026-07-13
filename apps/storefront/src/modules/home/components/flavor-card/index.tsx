import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductImage from "@modules/common/components/product-image"

type FlavorCardProps = {
  name: string
  subtitle?: string
  image?: string
  href: string
  price?: string
}

/** Presentational card for a single flavor on the home showcase grid. */
const FlavorCard: React.FC<FlavorCardProps> = ({
  name,
  subtitle,
  image,
  href,
  price,
}) => {
  return (
    <LocalizedClientLink
      href={href}
      className="group flex flex-col rounded-large focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-fg-interactive focus-visible:ring-offset-2"
      data-testid="flavor-card"
    >
      <div className="transition-shadow duration-150 ease-in-out group-hover:shadow-elevation-card-hover rounded-large">
        <ProductImage
          src={image}
          alt={`${name} jam`}
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-medium text-ui-fg-base">{name}</h3>
        {price && (
          <span className="text-sm text-ui-fg-subtle">from {price}</span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-ui-fg-subtle line-clamp-2">{subtitle}</p>
      )}
    </LocalizedClientLink>
  )
}

export default FlavorCard
