import { expect, test } from "@playwright/test"

/** Scenario 2 — flavor card navigates to the flavor's 8oz shop page. */
test("flavor card lands on /us/shop/<slug>-8oz with title and price", async ({
  page,
}) => {
  await page.goto("/us")
  await page.getByTestId("flavor-card").filter({ hasText: "Apricot" }).click()

  await page.waitForURL("**/us/shop/apricot-8oz")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Apricot Jam")
  await expect(page.getByTestId("product-price")).toHaveText("$14.89")
})

/** Scenario 3 — size change updates price + URL without a full reload. */
test("size change updates price and URL without reloading", async ({ page }) => {
  await page.goto("/us/shop/apricot-8oz")
  await page.evaluate(() => {
    ;(window as unknown as Record<string, unknown>).__noReloadMarker = true
  })

  const sizeGroup = page.getByTestId("size-select")

  await sizeGroup.getByRole("radio", { name: "Medium · 12 oz" }).click()
  await page.waitForURL("**/us/shop/apricot-12oz")
  await expect(page.getByTestId("product-price")).toHaveText("$22.89")

  await sizeGroup.getByRole("radio", { name: "Large · 18 oz" }).click()
  await page.waitForURL("**/us/shop/apricot-18oz")
  await expect(page.getByTestId("product-price")).toHaveText("$33.89")

  // A full page load would have wiped the marker set before the clicks.
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__noReloadMarker
    )
  ).toBe(true)
})

/**
 * Scenario 4 — browser back restores the previous configuration.
 * (Caught a real bug on first run: the configurator used router.replace,
 * which killed back-button restore; fixed to router.push.)
 */
test(
  "browser back restores the previous configuration",
  async ({ page }) => {
    await page.goto("/us/shop/strawberry-8oz")

    await page
      .getByTestId("size-select")
      .getByRole("radio", { name: "Medium · 12 oz" })
      .click()
    await page.waitForURL("**/us/shop/strawberry-12oz")
    await expect(page.getByTestId("product-price")).toHaveText("$22.89")

    await page.goBack()

    await page.waitForURL("**/us/shop/strawberry-8oz")
    await expect(page.getByTestId("product-price")).toHaveText("$14.89")
    await expect(
      page
        .getByTestId("size-select")
        .getByRole("radio", { name: "Small · 8 oz" })
    ).toHaveAttribute("aria-checked", "true")
  }
)

/** Scenario 5 — keyboard-only selection in the size radiogroup. */
test("arrow keys and Space drive the size radiogroup", async ({ page }) => {
  await page.goto("/us/shop/blueberry-8oz")

  const sizeGroup = page.getByTestId("size-select")
  await sizeGroup.getByRole("radio", { name: "Small · 8 oz" }).focus()

  // ArrowRight selects the next enabled option (WAI-ARIA radiogroup).
  await page.keyboard.press("ArrowRight")
  await page.waitForURL("**/us/shop/blueberry-12oz")
  await expect(page.getByTestId("product-price")).toHaveText("$22.89")
  await expect(
    sizeGroup.getByRole("radio", { name: "Medium · 12 oz" })
  ).toHaveAttribute("aria-checked", "true")

  // Space selects the focused radio. Re-focus explicitly: the server
  // re-render after the arrow-key navigation drops DOM focus, so a blind
  // second keypress would go nowhere.
  await sizeGroup.getByRole("radio", { name: "Large · 18 oz" }).focus()
  await page.keyboard.press(" ")
  await page.waitForURL("**/us/shop/blueberry-18oz")
  await expect(page.getByTestId("product-price")).toHaveText("$33.89")
  await expect(
    sizeGroup.getByRole("radio", { name: "Large · 18 oz" })
  ).toHaveAttribute("aria-checked", "true")
})
