import {
  CURRENCY_CODE,
  SHIPPING_OPTION_NAME,
  MANUAL_FULFILLMENT_PROVIDER_ID,
  SHIPPING_RATE_USD,
} from "../shipping-seed";

const decimals = (n: number): number => (String(n).split(".")[1] ?? "").length;

describe("shipping-seed deterministic logic", () => {
  it('names the option "Standard Shipping"', () => {
    expect(SHIPPING_OPTION_NAME).toBe("Standard Shipping");
  });

  it("prices the flat rate at $5 in decimal dollars (not cents)", () => {
    expect(SHIPPING_RATE_USD).toBe(5);
    // decimal-dollar guard: a $5 rate must never be 500
    expect(decimals(SHIPPING_RATE_USD)).toBeLessThanOrEqual(2);
    expect(SHIPPING_RATE_USD).toBeLessThan(100);
  });

  it("uses the manual fulfillment provider and usd", () => {
    expect(MANUAL_FULFILLMENT_PROVIDER_ID).toBe("manual_manual");
    expect(CURRENCY_CODE).toBe("usd");
  });
});
