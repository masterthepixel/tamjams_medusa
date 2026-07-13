import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";

import initialDataSeed from "../../src/migration-scripts/initial-data-seed";
import catalogSeed, { SALES_CHANNEL_ID } from "../../src/migration-scripts/catalog-seed";
import shippingSeed from "../../src/migration-scripts/shipping-seed";

// Booting Medusa per suite is slow; give the whole suite room.
jest.setTimeout(180_000);

const PRODUCT_HANDLE = "tamjams-jar";
const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile";

/**
 * DB isolation: medusaIntegrationTestRunner creates a THROWAWAY database on the
 * local Docker Postgres (host/user/pass from DB_HOST/DB_PORT/DB_USERNAME/
 * DB_PASSWORD, forced to localhost:5432 / tamjams in integration-tests/setup.js)
 * and overrides medusa-config's databaseUrl with it at boot — never .env's
 * Supabase URL. Test output shows a generated DB name like "medusa-integration-1".
 *
 * The runner runs core migrations + module links, but does NOT run our
 * src/migration-scripts (the seeds). So we invoke the three seed default exports
 * directly in beforeAll via the container. Two prerequisites the seeds assume
 * from production but that don't exist in a fresh DB are created first:
 *   - the sales channel with the exact hardcoded SALES_CHANNEL_ID the seeds wire to
 *   - the "Default Shipping Profile" the catalog/shipping seeds look up by name
 * (On boot Medusa's createDefaultsWorkflow makes a "Default Sales Channel",
 * a default store, and a default publishable key — but no shipping profile.)
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string;
    let regionId: string;

    beforeAll(async () => {
      const container = getContainer();
      const query = container.resolve(ContainerRegistrationKeys.QUERY);
      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
      const fulfillmentModule = container.resolve(Modules.FULFILLMENT);

      // Prereq 1: sales channel with the exact id the seeds hardcode.
      const { data: existingSc } = await query.graph({
        entity: "sales_channel",
        fields: ["id"],
        filters: { id: SALES_CHANNEL_ID },
      });
      if (!existingSc.length) {
        await salesChannelModule.createSalesChannels({
          id: SALES_CHANNEL_ID,
          name: "TamJams Storefront (test)",
        });
      }

      // Prereq 2: default shipping profile the seeds look up by name.
      const existingProfiles = await fulfillmentModule.listShippingProfiles({
        name: DEFAULT_SHIPPING_PROFILE_NAME,
      });
      if (!existingProfiles.length) {
        await fulfillmentModule.createShippingProfiles({
          name: DEFAULT_SHIPPING_PROFILE_NAME,
          type: "default",
        });
      }

      // Run the three seeds in production order.
      await initialDataSeed({ container });
      await catalogSeed({ container });
      await shippingSeed({ container });

      // A publishable key scoped to the product's sales channel, for /store.
      const {
        result: [apiKey],
      } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: "Test Storefront", type: "publishable", created_by: "test" },
          ],
        },
      });
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: apiKey.id, add: [SALES_CHANNEL_ID] },
      });
      publishableKey = apiKey.token;

      const { data: regions } = await query.graph({
        entity: "region",
        fields: ["id", "currency_code", "name"],
        filters: { name: "United States" },
      });
      regionId = regions[0].id;
    });

    const keyHeaders = () => ({ headers: { "x-publishable-api-key": publishableKey } });

    describe("Store API — products", () => {
      it("returns tamjams-jar with 21 variants at decimal-dollar prices and TJ-* SKUs", async () => {
        const res = await api.get(
          `/store/products?handle=${PRODUCT_HANDLE}&region_id=${regionId}` +
            `&fields=id,handle,*variants,*variants.calculated_price`,
          keyHeaders()
        );

        expect(res.status).toBe(200);
        const products = res.data.products;
        expect(products).toHaveLength(1);

        const product = products[0];
        expect(product.handle).toBe(PRODUCT_HANDLE);
        expect(product.variants).toHaveLength(21);

        const expectedPrices = new Set([14.89, 22.89, 33.89]);
        for (const variant of product.variants) {
          // SKUs follow the TJ-<FLAVOR>-<SIZE> scheme.
          expect(variant.sku).toMatch(/^TJ-[A-Z]+-(SMALL|MEDIUM|LARGE)$/);

          // Prices are decimal dollars, NOT cents (14.89, never 1489).
          const amount = variant.calculated_price.calculated_amount;
          expect(expectedPrices.has(amount)).toBe(true);
          expect(amount).toBeLessThan(100);
        }

        // All three price points are represented across the 21 variants.
        const amounts = new Set(
          product.variants.map((v: any) => v.calculated_price.calculated_amount)
        );
        expect(amounts).toEqual(expectedPrices);
      });

      it("rejects /store/products with no publishable key (400/401)", async () => {
        const res = await api.get(`/store/products`, { validateStatus: () => true });
        expect([400, 401]).toContain(res.status);
      });
    });

    describe("Region", () => {
      it("has a US region in usd", async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: regions } = await query.graph({
          entity: "region",
          fields: ["id", "name", "currency_code"],
          filters: { name: "United States" },
        });
        expect(regions.length).toBeGreaterThanOrEqual(1);
        expect(regions[0].currency_code).toBe("usd");
      });
    });

    describe("Cart lifecycle → order", () => {
      it("creates a cart, adds a variant, updates qty, ships, pays, and completes with correct totals", async () => {
        // Resolve the strawberry-small variant (TJ-STRAW-SMALL @ $14.89).
        const productRes = await api.get(
          `/store/products?handle=${PRODUCT_HANDLE}&region_id=${regionId}&fields=id,*variants`,
          keyHeaders()
        );
        const variant = productRes.data.products[0].variants.find(
          (v: any) => v.sku === "TJ-STRAW-SMALL"
        );
        expect(variant).toBeDefined();

        // Create cart in the US region.
        const cartRes = await api.post(
          `/store/carts`,
          { region_id: regionId },
          keyHeaders()
        );
        expect(cartRes.status).toBe(200);
        const cartId = cartRes.data.cart.id;

        // Add the variant, then bump quantity to 2.
        await api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variant.id, quantity: 1 },
          keyHeaders()
        );
        const lineRes = await api.get(`/store/carts/${cartId}`, keyHeaders());
        const lineItem = lineRes.data.cart.items[0];

        const updated = await api.post(
          `/store/carts/${cartId}/line-items/${lineItem.id}`,
          { quantity: 2 },
          keyHeaders()
        );
        const cart = updated.data.cart;
        const item = cart.items[0];
        expect(item.quantity).toBe(2);
        expect(item.unit_price).toBeCloseTo(14.89, 2);
        // 2 × 14.89 = 29.78 (decimal dollars, not cents).
        expect(cart.item_total).toBeCloseTo(29.78, 2);

        // Attach an email + shipping address so shipping options resolve.
        await api.post(
          `/store/carts/${cartId}`,
          {
            email: "buyer@example.com",
            shipping_address: {
              first_name: "Test",
              last_name: "Buyer",
              address_1: "1 Jam St",
              city: "Los Angeles",
              province: "CA",
              postal_code: "90001",
              country_code: "us",
            },
          },
          keyHeaders()
        );

        // Standard Shipping ($5) must be offered.
        const optsRes = await api.get(
          `/store/shipping-options?cart_id=${cartId}`,
          keyHeaders()
        );
        const standard = optsRes.data.shipping_options.find(
          (o: any) => o.name === "Standard Shipping"
        );
        expect(standard).toBeDefined();
        expect(standard.amount).toBeCloseTo(5, 2);

        await api.post(
          `/store/carts/${cartId}/shipping-methods`,
          { option_id: standard.id },
          keyHeaders()
        );

        // Initiate the manual (pp_system_default) payment session.
        const pcRes = await api.post(
          `/store/payment-collections`,
          { cart_id: cartId },
          keyHeaders()
        );
        const paymentCollectionId = pcRes.data.payment_collection.id;
        await api.post(
          `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
          { provider_id: "pp_system_default" },
          keyHeaders()
        );

        // Complete → an order with total 29.78 + 5 = 34.78.
        const completeRes = await api.post(
          `/store/carts/${cartId}/complete`,
          {},
          keyHeaders()
        );
        expect(completeRes.data.type).toBe("order");
        const order = completeRes.data.order;
        expect(order.total).toBeCloseTo(34.78, 2);
        expect(order.shipping_total).toBeCloseTo(5, 2);
        expect(order.item_total).toBeCloseTo(29.78, 2);
      });
    });

    describe("Seed idempotency", () => {
      // NOTE: catalog-seed and shipping-seed carry in-body idempotency guards and
      // own the asserted counts, so they are re-invoked here. initial-data-seed is
      // intentionally NOT re-invoked: it has no in-body guard (it relies on
      // migration run-once tracking) and is non-idempotent by design — a second
      // run calls createRegionsWorkflow with country "us", which is already claimed
      // by the first region, and Medusa throws (a country belongs to one region).
      it("keeps counts stable when catalog + shipping seeds run a second time", async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);

        const countProducts = async () =>
          (
            await query.graph({
              entity: "product",
              fields: ["id"],
              filters: { handle: PRODUCT_HANDLE },
            })
          ).data.length;
        const countVariants = async () => {
          const { data } = await query.graph({
            entity: "product",
            fields: ["variants.id"],
            filters: { handle: PRODUCT_HANDLE },
          });
          return (data[0]?.variants ?? []).length;
        };
        const countShippingOptions = async () =>
          (
            await query.graph({ entity: "shipping_option", fields: ["id"] })
          ).data.length;

        // Baseline (seeds already ran once in beforeAll).
        expect(await countProducts()).toBe(1);
        expect(await countVariants()).toBe(21);
        expect(await countShippingOptions()).toBe(1);

        // Second run — both guard against duplication.
        await catalogSeed({ container });
        await shippingSeed({ container });

        expect(await countProducts()).toBe(1);
        expect(await countVariants()).toBe(21);
        expect(await countShippingOptions()).toBe(1);
      });
    });
  },
});
