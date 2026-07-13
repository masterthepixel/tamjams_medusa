import { expect, test } from "@playwright/test"

/** Scenario 8 — an unresolvable config 404s. */
test("/us/shop/not-a-jam-99oz renders the 404 page", async ({ page }) => {
  const response = await page.goto("/us/shop/not-a-jam-99oz")

  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole("heading", { name: "Page not found" })
  ).toBeVisible()
})
