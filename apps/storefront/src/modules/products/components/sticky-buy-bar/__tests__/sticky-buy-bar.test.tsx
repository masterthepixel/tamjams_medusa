import { HttpTypes } from "@medusajs/types"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import StickyBuyBar from "../index"

const variant = { id: "variant_1" } as HttpTypes.StoreProductVariant

const baseProps = {
  title: "Sour Cherry",
  subtitle: "Large (18oz)",
  price: "$33.89",
  inStock: true,
  isAdding: false,
  onAddToCart: vi.fn(),
  variant,
}

describe("StickyBuyBar", () => {
  it("is aria-hidden with an untabbable button when hidden", () => {
    render(<StickyBuyBar {...baseProps} visible={false} />)
    expect(screen.getByTestId("sticky-buy-bar")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    expect(screen.getByTestId("sticky-add-to-cart")).toHaveAttribute(
      "tabindex",
      "-1"
    )
  })

  it("shows title, price, and a tabbable Add to Bag button when visible", () => {
    render(<StickyBuyBar {...baseProps} visible={true} />)
    expect(screen.getByTestId("sticky-buy-bar")).toHaveAttribute(
      "aria-hidden",
      "false"
    )
    expect(screen.getByText("Sour Cherry")).toBeInTheDocument()
    expect(screen.getByText("Large (18oz)")).toBeInTheDocument()
    expect(screen.getByTestId("sticky-price")).toHaveTextContent("$33.89")

    const button = screen.getByTestId("sticky-add-to-cart")
    expect(button).toHaveTextContent("Add to Bag")
    expect(button).toHaveAttribute("tabindex", "0")
    expect(button).toBeEnabled()
  })

  it("fires the add-to-cart handler on click", async () => {
    const user = userEvent.setup()
    const onAddToCart = vi.fn()
    render(
      <StickyBuyBar {...baseProps} visible={true} onAddToCart={onAddToCart} />
    )

    await user.click(screen.getByTestId("sticky-add-to-cart"))
    expect(onAddToCart).toHaveBeenCalledTimes(1)
  })

  it("shows Sold out and disables the button when out of stock", () => {
    render(<StickyBuyBar {...baseProps} visible={true} inStock={false} />)
    const button = screen.getByTestId("sticky-add-to-cart")
    expect(button).toHaveTextContent("Sold out")
    expect(button).toBeDisabled()
  })

  it("disables the button while adding", () => {
    render(<StickyBuyBar {...baseProps} visible={true} isAdding={true} />)
    expect(screen.getByTestId("sticky-add-to-cart")).toBeDisabled()
  })

  it("disables the button when no variant is resolved", () => {
    render(<StickyBuyBar {...baseProps} visible={true} variant={undefined} />)
    expect(screen.getByTestId("sticky-add-to-cart")).toBeDisabled()
  })

  it("omits the price element when no price is provided", () => {
    render(<StickyBuyBar {...baseProps} visible={true} price={undefined} />)
    expect(screen.queryByTestId("sticky-price")).not.toBeInTheDocument()
  })
})
