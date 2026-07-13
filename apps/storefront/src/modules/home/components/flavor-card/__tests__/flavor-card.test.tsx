import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import FlavorCard from "../index"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "us" }),
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: Record<string, unknown> & {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    ...rest
  }: Record<string, unknown> & { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={src} alt={alt} {...rest} />
  ),
}))

const props = {
  name: "Sour Cherry",
  subtitle: "Tart sour cherry jam with bright, complex flavor",
  image: "/images/products/sour-cherry-jam.jpg",
  href: "/shop/sour-cherry-8oz",
  price: "$14.89",
}

describe("FlavorCard", () => {
  it("wraps the card in a localized link to the configurator", () => {
    render(<FlavorCard {...props} />)
    expect(screen.getByTestId("flavor-card")).toHaveAttribute(
      "href",
      "/us/shop/sour-cherry-8oz"
    )
  })

  it("renders the flavor name, from-price, and subtitle", () => {
    render(<FlavorCard {...props} />)
    expect(
      screen.getByRole("heading", { name: "Sour Cherry" })
    ).toBeInTheDocument()
    expect(screen.getByText("from $14.89")).toBeInTheDocument()
    expect(
      screen.getByText("Tart sour cherry jam with bright, complex flavor")
    ).toBeInTheDocument()
  })

  it("renders the flavor image with a descriptive alt", () => {
    render(<FlavorCard {...props} />)
    expect(screen.getByRole("img", { name: "Sour Cherry jam" })).toHaveAttribute(
      "src",
      "/images/products/sour-cherry-jam.jpg"
    )
  })

  it("omits price and subtitle when not provided", () => {
    render(<FlavorCard name="Apple" href="/shop/apple-8oz" />)
    expect(screen.queryByText(/^from/)).not.toBeInTheDocument()
    expect(screen.getByTestId("flavor-card")).toHaveAttribute(
      "href",
      "/us/shop/apple-8oz"
    )
  })
})
