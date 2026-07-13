"use client"

import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"

type StickyBuyBarProps = {
  visible: boolean
  title: string
  subtitle?: string
  price?: string
  inStock: boolean
  isAdding: boolean
  onAddToCart: () => void
  variant?: HttpTypes.StoreProductVariant
}

/**
 * Reveals a fixed bottom bar with the live price and Add to Bag once the main
 * actions scroll out of view. Presentational — visibility and handlers are
 * owned by the configurator.
 */
const StickyBuyBar: React.FC<StickyBuyBarProps> = ({
  visible,
  title,
  subtitle,
  price,
  inStock,
  isAdding,
  onAddToCart,
  variant,
}) => {
  return (
    <div
      className={clx(
        "fixed inset-x-0 bottom-0 z-50 border-t border-ui-border-base bg-ui-bg-base transition-transform duration-300 ease-in-out",
        {
          "translate-y-0": visible,
          "translate-y-full": !visible,
        }
      )}
      aria-hidden={!visible}
      data-testid="sticky-buy-bar"
    >
      <div className="content-container flex items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-ui-fg-base">
            {title}
          </span>
          {subtitle && (
            <span className="truncate text-xs text-ui-fg-subtle">
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {price && (
            <span
              className="text-lg font-semibold text-ui-fg-base"
              data-testid="sticky-price"
            >
              {price}
            </span>
          )}
          <Button
            onClick={onAddToCart}
            disabled={!inStock || !variant || isAdding}
            variant="primary"
            isLoading={isAdding}
            className="h-10 whitespace-nowrap"
            tabIndex={visible ? 0 : -1}
            data-testid="sticky-add-to-cart"
          >
            {!inStock ? "Sold out" : "Add to Bag"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default StickyBuyBar
