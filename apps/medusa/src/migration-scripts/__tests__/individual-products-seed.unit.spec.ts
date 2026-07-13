import { FLAVORS, SIZES } from "../catalog-seed";
import { skuForIndividual } from "../individual-products-seed";

// Number of decimal places in a numeric price literal (decimal-dollar guard).
const decimals = (n: number): number => (String(n).split(".")[1] ?? "").length;

describe("individual-products-seed deterministic logic", () => {
  describe("skuForIndividual", () => {
    it("produces TJF-<FLAVOR>-<SIZE> for all 21 combos", () => {
      for (const flavor of FLAVORS) {
        for (const size of SIZES) {
          expect(skuForIndividual(flavor.code, size.code)).toBe(
            `TJF-${flavor.code}-${size.code}`
          );
        }
      }
    });

    it("is deterministic (same inputs → same output)", () => {
      for (const flavor of FLAVORS) {
        for (const size of SIZES) {
          expect(skuForIndividual(flavor.code, size.code)).toBe(
            skuForIndividual(flavor.code, size.code)
          );
        }
      }
    });

    it("yields 21 unique TJF-* SKUs across the full matrix", () => {
      const skus = FLAVORS.flatMap((flavor) =>
        SIZES.map((size) => skuForIndividual(flavor.code, size.code))
      );
      expect(skus).toHaveLength(21);
      expect(new Set(skus).size).toBe(21);
    });

    it("never collides with TJ-* configurator SKUs", () => {
      const tjfSkus = FLAVORS.flatMap((flavor) =>
        SIZES.map((size) => skuForIndividual(flavor.code, size.code))
      );
      const tjSkus = FLAVORS.flatMap((flavor) =>
        SIZES.map((size) => `TJ-${flavor.code}-${size.code}`)
      );
      const allSkus = [...tjfSkus, ...tjSkus];
      const uniqueSkus = new Set(allSkus);
      // If there are collisions, uniqueSkus.size < allSkus.length
      expect(uniqueSkus.size).toBe(allSkus.length);
      expect(uniqueSkus.size).toBe(42); // 21 TJF + 21 TJ
    });

    it("matches known SKU examples exactly", () => {
      expect(skuForIndividual("APRICOT", "SMALL")).toBe("TJF-APRICOT-SMALL");
      expect(skuForIndividual("STRAW", "MEDIUM")).toBe("TJF-STRAW-MEDIUM");
      expect(skuForIndividual("SRCHERRY", "LARGE")).toBe("TJF-SRCHERRY-LARGE");
    });
  });

  describe("Flavor handles match product-data.json", () => {
    it("has exactly 7 flavor handles", () => {
      expect(FLAVORS).toHaveLength(7);
    });

    it("handles are lowercase with -jam suffix", () => {
      const expectedHandles = [
        "apricot-jam",
        "strawberry-jam",
        "blueberry-jam",
        "raspberry-jam",
        "apple-jam",
        "quince-jam",
        "sour-cherry-jam",
      ];
      expect(FLAVORS.map((f) => f.handle)).toEqual(expectedHandles);
    });
  });

  describe("Prices (shared with catalog) remain decimal-dollar", () => {
    it("prices are always 14.89 / 22.89 / 33.89", () => {
      expect(SIZES.map((s) => s.priceUsd)).toEqual([14.89, 22.89, 33.89]);
    });

    it("every price has at most 2 decimal places (decimal-dollar guard)", () => {
      for (const size of SIZES) {
        expect(decimals(size.priceUsd)).toBeLessThanOrEqual(2);
        // guard against a cents mistake: $14.89 must never be 1489
        expect(size.priceUsd).toBeLessThan(100);
      }
    });
  });
});
