import { expect, test } from "@playwright/test"

/** Scenario 1 — home renders 7 flavor cards, each showing a price. */
test("home renders 7 flavor cards with API prices", async ({ page }) => {
  await page.goto("/us")

  const cards = page.getByTestId("flavor-card")
  await expect(cards).toHaveCount(7)

  // All cards link to the 8oz size, so every price is the small-jar price.
  for (const card of await cards.all()) {
    await expect(card).toContainText("from $14.89")
  }
})
