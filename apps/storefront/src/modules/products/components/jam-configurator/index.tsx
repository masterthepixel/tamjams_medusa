"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  buildConfig,
  flavorsFromProduct,
  isVariantInStock,
  resolveVariant,
  sizesFromProduct,
} from "@lib/util/tamjams"
import { HttpTypes } from "@medusajs/types"
import ProductImage from "@modules/common/components/product-image"
import { Button, clx } from "@modules/common/components/ui"
import OptionRadioGroup, {
  RadioOption,
} from "@modules/products/components/option-radio-group"
import StickyBuyBar from "@modules/products/components/sticky-buy-bar"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

type JamConfiguratorProps = {
  product: HttpTypes.StoreProduct
  flavorSlug: string
  oz: number
  countryCode: string
}

/**
 * Single interactive island for the shop configurator. The URL segment
 * (`<flavor>-<oz>oz`) is the source of truth: selecting an option performs a
 * shallow `router.push`, the server re-renders with the new params, and this
 * component receives the new `flavorSlug`/`oz` props. No selection state is
 * duplicated client-side. `push` (not `replace`) so each selection is a
 * history entry and the browser back button restores prior configs.
 */
const JamConfigurator: React.FC<JamConfiguratorProps> = ({
  product,
  flavorSlug,
  oz,
  countryCode,
}) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAdding, setIsAdding] = useState(false)

  const flavors = flavorsFromProduct(product)
  const sizes = sizesFromProduct(product)

  const selectedVariant = resolveVariant(product, flavorSlug, oz)
  const inStock = isVariantInStock(selectedVariant)

  const { variantPrice } = getProductPrice({
    product,
    variantId: selectedVariant?.id,
  })

  const image =
    (selectedVariant?.metadata?.image as string | undefined) ??
    flavors.find((f) => f.slug === flavorSlug)?.image ??
    product.thumbnail ??
    undefined

  const flavorName =
    flavors.find((f) => f.slug === flavorSlug)?.name ?? product.title

  const subtitle = selectedVariant?.metadata?.subtitle as string | undefined

  const navigate = (nextFlavor: string, nextOz: number) => {
    const config = buildConfig(nextFlavor, nextOz)
    startTransition(() => {
      router.push(`/${countryCode}/shop/${config}`, { scroll: false })
    })
  }

  const flavorOptions: RadioOption[] = flavors.map((f) => ({
    value: f.slug,
    label: f.name,
  }))

  const sizeOptions: RadioOption[] = sizes.map((s) => ({
    value: s.token,
    label: `${s.label} · ${s.oz} oz`,
    disabled: !isVariantInStock(resolveVariant(product, flavorSlug, s.oz)),
  }))

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return
    setIsAdding(true)
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      })
      router.refresh()
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-8 small:flex-row small:gap-x-12">
      <div className="small:w-1/2">
        <div
          className={clx("transition-opacity duration-200", {
            "opacity-60": isPending,
          })}
        >
          <ProductImage
            src={image}
            alt={`${flavorName} jam`}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </div>

      <div className="flex flex-col gap-y-6 small:w-1/2" ref={actionsRef}>
        <div className="flex flex-col gap-y-1">
          <h1 className="text-2xl font-semibold text-ui-fg-base">
            {flavorName} Jam
          </h1>
          {subtitle && <p className="text-ui-fg-subtle">{subtitle}</p>}
        </div>

        <OptionRadioGroup
          title="Flavor"
          options={flavorOptions}
          value={flavorSlug}
          onChange={(v) => navigate(v, oz)}
          data-testid="flavor-select"
        />

        <OptionRadioGroup
          title="Size"
          options={sizeOptions}
          value={`${oz}oz`}
          onChange={(v) => navigate(flavorSlug, parseInt(v, 10))}
          data-testid="size-select"
        />

        <div className="flex flex-col gap-y-1">
          <span
            className="text-2xl font-semibold text-ui-fg-base"
            data-testid="product-price"
            data-value={variantPrice?.calculated_price_number}
          >
            {variantPrice?.calculated_price ?? "—"}
          </span>
          {!inStock && (
            <span className="text-sm text-ui-fg-error" data-testid="sold-out">
              This size is currently sold out
            </span>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={!inStock || !selectedVariant || isAdding}
          variant="primary"
          isLoading={isAdding}
          className="h-11 w-full"
          data-testid="add-to-cart"
        >
          {!selectedVariant
            ? "Unavailable"
            : !inStock
            ? "Sold out"
            : "Add to Bag"}
        </Button>
      </div>

      <StickyBuyBar
        visible={!inView}
        title={`${flavorName} Jam`}
        subtitle={sizes.find((s) => s.oz === oz)?.label}
        price={variantPrice?.calculated_price}
        inStock={inStock}
        isAdding={isAdding}
        onAddToCart={handleAddToCart}
        variant={selectedVariant}
        thumbnail={image}
      />
    </div>
  )
}

export default JamConfigurator
