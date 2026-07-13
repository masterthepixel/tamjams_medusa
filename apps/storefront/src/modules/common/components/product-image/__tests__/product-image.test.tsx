import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ProductImage from "../index"

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

describe("ProductImage", () => {
  it("renders an img with the given src and alt", () => {
    render(<ProductImage src="/images/products/apricot-jam.jpg" alt="Apricot jam" />)
    const img = screen.getByRole("img", { name: "Apricot jam" })
    expect(img).toHaveAttribute("src", "/images/products/apricot-jam.jpg")
  })

  it("renders the placeholder when no src is provided", () => {
    const { container } = render(<ProductImage alt="Apricot jam" />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("falls back to the placeholder when the image errors", () => {
    const { container } = render(
      <ProductImage src="/images/products/missing.jpg" alt="Missing jam" />
    )
    fireEvent.error(screen.getByRole("img", { name: "Missing jam" }))

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("resets the failure state when the src changes", () => {
    const { container, rerender } = render(
      <ProductImage src="/images/products/missing.jpg" alt="Jam" />
    )
    fireEvent.error(screen.getByRole("img", { name: "Jam" }))
    expect(screen.queryByRole("img")).not.toBeInTheDocument()

    rerender(<ProductImage src="/images/products/apricot-jam.jpg" alt="Jam" />)
    const img = screen.getByRole("img", { name: "Jam" })
    expect(img).toHaveAttribute("src", "/images/products/apricot-jam.jpg")
    expect(container.querySelector("svg")).not.toBeInTheDocument()
  })
})
