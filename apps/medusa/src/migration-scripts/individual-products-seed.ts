import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  batchVariantImagesWorkflow,
} from "@medusajs/medusa/core-flows";

import { FLAVORS, SIZES, SALES_CHANNEL_ID, imageUrlFor } from "./catalog-seed";

const CURRENCY_CODE = "usd";
const STOCK_LOCATION_NAME = "TamJams Warehouse";
const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile";

export function skuForIndividual(flavorCode: string, sizeCode: string): string {
  return `TJF-${flavorCode}-${sizeCode}`;
}

export default async function individual_products_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Ensuring TamJams stock location exists...");
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    filters: { name: STOCK_LOCATION_NAME },
  });

  if (!existingLocations.length) {
    logger.warn(
      `Stock location "${STOCK_LOCATION_NAME}" not found. Did you run catalog-seed first?`
    );
    return;
  }

  const stockLocationId = existingLocations[0].id;

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
    filters: { name: DEFAULT_SHIPPING_PROFILE_NAME },
  });
  const shippingProfileId = shippingProfiles[0]?.id;

  const summary: any[] = [];

  for (const flavor of FLAVORS) {
    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle: flavor.handle },
    });

    if (existingProducts.length) {
      logger.info(
        `Product "${flavor.handle}" already exists (${existingProducts[0].id}). Skipping.`
      );
      continue;
    }

    logger.info(`Creating individual product for ${flavor.name} (${flavor.handle})...`);

    const variantsInput = SIZES.map((size) => ({
      title: `${flavor.name} - ${size.title}`,
      sku: skuForIndividual(flavor.code, size.code),
      manage_inventory: true,
      weight: size.grams,
      options: { Size: size.title },
      prices: [{ amount: size.priceUsd, currency_code: CURRENCY_CODE }],
      metadata: {
        flavor: flavor.name,
        size_oz: size.ounces,
        subtitle: flavor.subtitle,
        description: flavor.description,
        highlights: flavor.highlights,
        ingredients: flavor.ingredients,
        net_weight: flavor.netWeight,
        storage: flavor.storage,
        nutrition: flavor.nutrition,
        image: imageUrlFor(flavor),
      },
    }));

    const {
      result: [product],
    } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: `${flavor.name} Jam`,
            handle: flavor.handle,
            status: ProductStatus.PUBLISHED,
            subtitle: flavor.subtitle,
            description: flavor.description,
            images: [{ url: imageUrlFor(flavor) }],
            thumbnail: imageUrlFor(flavor),
            shipping_profile_id: shippingProfileId,
            options: [{ title: "Size", values: SIZES.map((size) => size.title) }],
            variants: variantsInput,
            sales_channels: [{ id: SALES_CHANNEL_ID }],
          },
        ],
      },
    });

    logger.info(`Linking image for ${flavor.name} variants...`);
    const { data: createdProduct } = await query.graph({
      entity: "product",
      fields: ["id", "images.id", "images.url", "variants.id", "variants.sku"],
      filters: { id: product.id },
    });

    const imageIdByUrl = new Map<string, string>(
      (createdProduct[0]?.images ?? []).map((image) => [image.url as string, image.id])
    );
    const variantIdBySku = new Map<string, string>(
      (createdProduct[0]?.variants ?? [])
        .filter((variant) => !!variant.sku)
        .map((variant) => [variant.sku as string, variant.id])
    );

    const imageId = imageIdByUrl.get(imageUrlFor(flavor));
    if (imageId) {
      for (const size of SIZES) {
        const variantId = variantIdBySku.get(skuForIndividual(flavor.code, size.code));
        if (variantId) {
          await batchVariantImagesWorkflow(container).run({
            input: { variant_id: variantId, add: [imageId] },
          });
        }
      }
    }

    logger.info(`Setting inventory for ${flavor.name} variants...`);
    const skus = SIZES.map((size) => skuForIndividual(flavor.code, size.code));
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku"],
      filters: { sku: skus },
    });
    const inventoryItemIdBySku = new Map<string, string>(
      inventoryItems
        .filter((item) => !!item.sku)
        .map((item) => [item.sku as string, item.id])
    );

    const inventory_levels = SIZES.map((size) => {
      const sku = skuForIndividual(flavor.code, size.code);
      const inventoryItemId = inventoryItemIdBySku.get(sku);
      if (!inventoryItemId) {
        throw new Error(`Missing inventory item for SKU ${sku}`);
      }
      return {
        inventory_item_id: inventoryItemId,
        location_id: stockLocationId,
        stocked_quantity: size.inventoryQty,
      };
    });

    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels } });

    for (const size of SIZES) {
      summary.push({
        flavor: flavor.name,
        handle: flavor.handle,
        size: size.title,
        sku: skuForIndividual(flavor.code, size.code),
        price_usd: size.priceUsd.toFixed(2),
        qty: size.inventoryQty,
      });
    }
  }

  if (summary.length > 0) {
    console.table(summary);
    logger.info(
      `Individual products seed complete: ${summary.length} variants created across ${FLAVORS.length} products.`
    );
  } else {
    logger.info("All individual products already exist. No new variants created.");
  }
}
