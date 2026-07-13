import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

const SALES_CHANNEL_ID = "sc_01KXCSZGBHJ9HXPEHKQYBCCXG1";
const CURRENCY_CODE = "usd";
const STOCK_LOCATION_NAME = "TamJams Warehouse";
const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile";
const FULFILLMENT_SET_NAME = "TamJams US Delivery";
const SERVICE_ZONE_NAME = "United States";
const SHIPPING_OPTION_NAME = "Standard Shipping";
const MANUAL_FULFILLMENT_PROVIDER_ID = "manual_manual";

/**
 * Idempotent seed that wires up fulfillment so the storefront checkout's
 * shipping step has at least one selectable option for the US region.
 *
 * Creates (if missing): a shipping fulfillment set + US service zone linked
 * to the TamJams Warehouse stock location, the manual fulfillment provider
 * link, and a flat-rate "Standard Shipping" option on the default shipping
 * profile. Safe to run repeatedly.
 */
export default async function shipping_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  // 1. Resolve the stock location (create + link to sales channel if missing).
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "fulfillment_sets.id", "fulfillment_sets.name"],
    filters: { name: STOCK_LOCATION_NAME },
  });

  let stockLocationId: string;
  let stockLocation = existingLocations[0];
  if (stockLocation) {
    stockLocationId = stockLocation.id;
  } else {
    logger.info(`Creating stock location "${STOCK_LOCATION_NAME}"...`);
    const {
      result: [created],
    } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: STOCK_LOCATION_NAME }] },
    });
    stockLocationId = created.id;
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocationId, add: [SALES_CHANNEL_ID] },
    });
    stockLocation = { id: stockLocationId, name: STOCK_LOCATION_NAME } as any;
  }

  // 2. Resolve the default shipping profile.
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
    filters: { name: DEFAULT_SHIPPING_PROFILE_NAME },
  });
  const shippingProfileId = shippingProfiles[0]?.id;
  if (!shippingProfileId) {
    throw new Error(
      `Shipping profile "${DEFAULT_SHIPPING_PROFILE_NAME}" not found. Run the catalog seed first.`
    );
  }

  // 3. Short-circuit if a store-enabled shipping option already exists.
  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  });
  if (existingOptions.length) {
    logger.info(
      `Shipping option(s) already exist (${existingOptions
        .map((o) => `${o.name}`)
        .join(", ")}). Skipping shipping seed.`
    );
    return;
  }

  // 4. Ensure the manual fulfillment provider is linked to the location.
  logger.info("Linking manual fulfillment provider to stock location...");
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: MANUAL_FULFILLMENT_PROVIDER_ID,
    },
  });

  // 5. Reuse or create the fulfillment set + US service zone.
  const { data: locationWithSets } = await query.graph({
    entity: "stock_location",
    fields: [
      "id",
      "fulfillment_sets.id",
      "fulfillment_sets.name",
      "fulfillment_sets.service_zones.id",
      "fulfillment_sets.service_zones.name",
    ],
    filters: { id: stockLocationId },
  });

  let fulfillmentSet = locationWithSets[0]?.fulfillment_sets?.find(
    (fs: any) => fs?.name === FULFILLMENT_SET_NAME
  );

  if (!fulfillmentSet) {
    logger.info("Creating fulfillment set + US service zone...");
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: FULFILLMENT_SET_NAME,
      type: "shipping",
      service_zones: [
        {
          name: SERVICE_ZONE_NAME,
          geo_zones: [{ type: "country", country_code: "us" }],
        },
      ],
    });

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    });
  }

  const serviceZoneId = fulfillmentSet.service_zones[0].id;

  // 6. Create the flat-rate shipping option. Amounts are decimal dollars
  //    (Medusa v2 stores money as-is, not in cents), matching the catalog seed.
  logger.info(`Creating "${SHIPPING_OPTION_NAME}" ($5.00 flat)...`);
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: SHIPPING_OPTION_NAME,
        price_type: "flat",
        provider_id: MANUAL_FULFILLMENT_PROVIDER_ID,
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfileId,
        type: {
          label: "Standard",
          description: "Ships in 2-3 business days.",
          code: "standard",
        },
        prices: [{ currency_code: CURRENCY_CODE, amount: 5 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });

  logger.info("Shipping seed complete: 1 flat-rate US option created.");
}
