import { expect, test } from "@playwright/test"

/**
 * Scenario 7 — guest checkout through address → delivery → payment.
 * Deliberately stops at the payment step: no order is placed, so the local DB
 * keeps no order rows and no inventory reservations.
 */
test("guest checkout reaches payment with $5.00 Standard Shipping", async ({
  page,
}) => {
  test.setTimeout(180_000)

  await page.goto("/us/shop/raspberry-12oz")
  await page.getByTestId("add-to-cart").click()
  await expect(page.getByTestId("nav-cart-link")).toHaveText("Cart (1)")

  await page.goto("/us/cart")
  await page.getByTestId("checkout-button").click()
  await page.waitForURL("**/us/checkout?step=address")

  await page.getByTestId("shipping-first-name-input").fill("Tam")
  await page.getByTestId("shipping-last-name-input").fill("Tester")
  await page.getByTestId("shipping-address-input").fill("123 Jam Lane")
  await page.getByTestId("shipping-postal-code-input").fill("90210")
  await page.getByTestId("shipping-city-input").fill("Los Angeles")
  await page.getByTestId("shipping-province-input").fill("CA")
  await page.getByTestId("shipping-country-select").selectOption("us")
  await page.getByTestId("shipping-email-input").fill("e2e@tamjams.test")
  await page.getByTestId("submit-address-button").click()

  await page.waitForURL(/step=delivery/)
  const standardShipping = page
    .getByTestId("delivery-option-radio")
    .filter({ hasText: "Standard Shipping" })
  await expect(standardShipping).toBeVisible()
  await expect(standardShipping).toContainText("$5.00")

  await standardShipping.click()
  await expect(page.getByTestId("cart-shipping")).toHaveAttribute(
    "data-value",
    "5"
  )
  await page.getByTestId("submit-delivery-option-button").click()

  await page.waitForURL(/step=payment/)
  await expect(page.getByText("Manual Payment")).toBeVisible()
  await expect(page.getByTestId("submit-payment-button")).toBeVisible()
  // Stop here — completing the order is out of scope to keep the DB tidy.
})
