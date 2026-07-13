import { expect, test } from "@playwright/test"

/** Scenario 6 — add to bag, nav count, cart line item, quantity totals. */
test("add to bag updates nav count and cart totals follow quantity", async ({
  page,
}) => {
  await page.goto("/us/shop/strawberry-12oz")

  await page.getByTestId("add-to-cart").click()
  await expect(page.getByTestId("nav-cart-link")).toHaveText("Cart (1)")

  await page.goto("/us/cart")

  const row = page.getByTestId("product-row")
  await expect(row).toHaveCount(1)
  await expect(row.getByTestId("product-title")).toHaveText("TamJams Jar")
  await expect(row).toContainText("Strawberry")
  await expect(row).toContainText("$22.89")
  await expect(page.getByTestId("cart-subtotal")).toHaveAttribute(
    "data-value",
    "22.89"
  )

  await page.getByTestId("product-select-button").selectOption("2")
  await expect(page.getByTestId("cart-subtotal")).toHaveAttribute(
    "data-value",
    "45.78"
  )
  await expect(page.getByTestId("cart-total")).toContainText("$45.78")
})
