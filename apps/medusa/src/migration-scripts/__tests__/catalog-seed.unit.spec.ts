import {
  BRAND_STORY,
  FLAVORS,
  SIZES,
  skuFor,
  imageUrlFor,
} from "../catalog-seed";

// Number of decimal places in a numeric price literal (decimal-dollar guard).
const decimals = (n: number): number => (String(n).split(".")[1] ?? "").length;

describe("catalog-seed deterministic logic", () => {
  describe("FLAVORS", () => {
    it("has exactly 7 entries", () => {
      expect(FLAVORS).toHaveLength(7);
    });

    it("has unique codes, handles, and names", () => {
      const codes = FLAVORS.map((f) => f.code);
      const handles = FLAVORS.map((f) => f.handle);
      const names = FLAVORS.map((f) => f.name);
      expect(new Set(codes).size).toBe(7);
      expect(new Set(handles).size).toBe(7);
      expect(new Set(names).size).toBe(7);
    });

    it("preserves the authoritative catalog order", () => {
      expect(FLAVORS.map((f) => f.code)).toEqual([
        "APRICOT",
        "STRAW",
        "BLUE",
        "RASP",
        "APPLE",
        "QUINCE",
        "SRCHERRY",
      ]);
    });

    it("prepends BRAND_STORY to every flavor description", () => {
      expect(BRAND_STORY.length).toBeGreaterThan(0);
      for (const flavor of FLAVORS) {
        expect(flavor.description.startsWith(BRAND_STORY)).toBe(true);
        // and the description carries flavor-specific copy after the story
        expect(flavor.description.length).toBeGreaterThan(BRAND_STORY.length);
      }
    });
  });

  describe("SIZES", () => {
    it("has exactly 3 entries", () => {
      expect(SIZES).toHaveLength(3);
    });

    it("has prices 14.89 / 22.89 / 33.89", () => {
      expect(SIZES.map((s) => s.priceUsd)).toEqual([14.89, 22.89, 33.89]);
    });

    it("ascends in price by ounces", () => {
      const byOz = [...SIZES].sort((a, b) => a.ounces - b.ounces);
      const prices = byOz.map((s) => s.priceUsd);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
      // strictly increasing
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThan(prices[i - 1]);
      }
    });

    it("every price has at most 2 decimal places (decimal-dollar guard)", () => {
      for (const size of SIZES) {
        expect(decimals(size.priceUsd)).toBeLessThanOrEqual(2);
        // guard against a cents mistake: a $14.89 jar must never be 1489
        expect(size.priceUsd).toBeLessThan(100);
      }
    });
  });

  describe("skuFor", () => {
    it("produces TJ-<FLAVOR>-<SIZE> for all 21 combos", () => {
      for (const flavor of FLAVORS) {
        for (const size of SIZES) {
          expect(skuFor(flavor, size)).toBe(`TJ-${flavor.code}-${size.code}`);
        }
      }
    });

    it("is deterministic (same inputs → same output)", () => {
      for (const flavor of FLAVORS) {
        for (const size of SIZES) {
          expect(skuFor(flavor, size)).toBe(skuFor(flavor, size));
        }
      }
    });

    it("yields 21 unique SKUs across the full matrix", () => {
      const skus = FLAVORS.flatMap((flavor) =>
        SIZES.map((size) => skuFor(flavor, size))
      );
      expect(skus).toHaveLength(21);
      expect(new Set(skus).size).toBe(21);
    });

    it("matches known SKUs exactly", () => {
      const apricot = FLAVORS.find((f) => f.code === "APRICOT")!;
      const small = SIZES.find((s) => s.code === "SMALL")!;
      const srcherry = FLAVORS.find((f) => f.code === "SRCHERRY")!;
      const large = SIZES.find((s) => s.code === "LARGE")!;
      expect(skuFor(apricot, small)).toBe("TJ-APRICOT-SMALL");
      expect(skuFor(srcherry, large)).toBe("TJ-SRCHERRY-LARGE");
    });
  });

  describe("imageUrlFor", () => {
    it("builds /images/products/<handle>.jpg", () => {
      for (const flavor of FLAVORS) {
        expect(imageUrlFor(flavor)).toBe(
          `/images/products/${flavor.handle}.jpg`
        );
      }
    });

    it("is deterministic and unique per flavor", () => {
      const urls = FLAVORS.map((f) => imageUrlFor(f));
      expect(new Set(urls).size).toBe(FLAVORS.length);
      expect(imageUrlFor(FLAVORS[0])).toBe(imageUrlFor(FLAVORS[0]));
    });
  });
});
