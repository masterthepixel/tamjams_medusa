import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import { batchVariantImagesWorkflow } from "@medusajs/medusa/core-flows";

const SALES_CHANNEL_ID = "sc_01KXCSZGBHJ9HXPEHKQYBCCXG1";
const CURRENCY_CODE = "usd";
const PRODUCT_HANDLE = "tamjams-jar";
const STOCK_LOCATION_NAME = "TamJams Warehouse";
const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile";
const IMAGE_BASE_PATH = "/images/products";

interface NutritionFacts {
  servingSize: string;
  servingsPerContainer: number;
  calories: number;
  fat: { total: number; saturated: number; trans: number };
  cholesterol: number;
  sodium: number;
  carbohydrates: {
    total: number;
    fiber: number;
    sugars: { total: number; added: number };
  };
  protein: number;
  vitamins: {
    vitaminD: string;
    calcium: string;
    iron: string;
    potassium: string;
  };
}

interface FlavorSpec {
  code: string;
  name: string;
  handle: string;
  subtitle: string;
  description: string;
  highlights: string[];
  ingredients: string;
  netWeight: string;
  storage: string;
  nutrition: NutritionFacts;
}

const SHARED_NUTRITION: NutritionFacts = {
  servingSize: "1 tbsp (18g)",
  servingsPerContainer: 20,
  calories: 35,
  fat: { total: 0, saturated: 0, trans: 0 },
  cholesterol: 0,
  sodium: 0,
  carbohydrates: { total: 9, fiber: 0, sugars: { total: 8, added: 8 } },
  protein: 0,
  vitamins: { vitaminD: "0%", calcium: "0%", iron: "0%", potassium: "0%" },
};

const SHARED_HIGHLIGHTS = ["Real Fruit", "Non-GMO", "Homemade", "No Additives"];

const BRAND_STORY =
  "A Story of Sweet Beginnings.\n\nTam's Jams was born from the heart of Tamara, an Armenian immigrant who came to America dreaming of becoming a Hollywood fashion designer. Life had other plans — raising a large family came first — but her creativity never faded. She simply traded fabric and thread for fruit and flavor.\n\nYears later, her grandson, now a filmmaker, brought her to the red carpet of his blockbuster premiere — letting her live a piece of her dream. Inspired by her passion, he encouraged her to share her other love with the world.\n\nTam's Jams is a celebration of family, heritage, and the sweetness of second chances.\n\n—\n\n";

const FLAVORS: FlavorSpec[] = [
  {
    code: "APRICOT",
    name: "Apricot",
    handle: "apricot-jam",
    subtitle: "Golden apricot jam with warm, sunny flavor",
    description:
      BRAND_STORY +
      "Our Apricot Jam captures the essence of golden, sun-ripened apricots in every spoonful. Made with 100% real fruit and pure cane sugar—no artificial flavors, no preservatives, no additives—this is jam as nature intended it. The warm, nostalgic sweetness brings back memories of homemade breakfasts and grandmother's kitchen.\n\nAt just 35 calories per serving, Apricot Jam is the perfect light spread for your morning toast, a natural topping for yogurt and oatmeal, or a sophisticated addition to your favorite baking recipes. The natural fruit sugars provide a clean sweetness without any chemical aftertaste.\n\nPerfect for vegetarian, vegan, and gluten-free diets. Non-GMO, small-batch made. Refrigerate after opening.",
    highlights: SHARED_HIGHLIGHTS,
    ingredients: "Apricots, Cane sugar, Lemon juice, and Water",
    netWeight: "12 oz | 340 g",
    storage: "Refrigerate after opening",
    nutrition: SHARED_NUTRITION,
  },
  {
    code: "STRAW",
    name: "Strawberry",
    handle: "strawberry-jam",
    subtitle: "Bright strawberry jam with fresh, sweet taste",
    description:
      BRAND_STORY +
      "Strawberry Jam is a timeless classic—and ours is made the way it should be. Bright, ripe strawberries combined with pure cane sugar create that perfect balance of sweetness and natural fruit flavor. 100% real strawberries, no artificial ingredients, no shortcuts.\n\nThis is the jam that built generations of breakfast traditions. Spread it thick on warm toast, swirl it into Greek yogurt for a protein-rich breakfast, or use it as the heart of a homemade pastry. With just 35 calories per serving, you get pure strawberry flavor without the guilt.\n\nVegan, vegetarian, and gluten-free by nature. Non-GMO, small-batch crafted, made with love in our kitchen. The kind of strawberry jam your grandmother would make—if she had Tam's passion for perfection.",
    highlights: SHARED_HIGHLIGHTS,
    ingredients: "Strawberries, Cane sugar, Lemon juice, and Water",
    netWeight: "12 oz | 340 g",
    storage: "Refrigerate after opening",
    nutrition: SHARED_NUTRITION,
  },
  {
    code: "BLUE",
    name: "Blueberry",
    handle: "blueberry-jam",
    subtitle: "Deep blueberry jam with rich, fruity notes",
    description:
      BRAND_STORY +
      "Blueberries are nature's candy—and our Blueberry Jam lets them shine. Made exclusively from ripe, deep-blue blueberries and pure cane sugar, this jam delivers the full antioxidant-rich taste of nature's superfruit in a convenient, delicious spread.\n\nEnjoy the deep, complex flavor that only real fruit can provide. At 35 calories per serving, Blueberry Jam is your guilt-free way to add real fruit to your diet. Perfect for health-conscious breakfast enthusiasts—swirl into Greek yogurt for extra protein, layer into chia pudding, or top your morning toast for a nutrient-rich start.\n\nNo artificial flavors, no added chemicals, no compromises. 100% real blueberries, naturally vegan and gluten-free. Small-batch made with the care that only a jam master like Tam can bring. Every jar is a taste of pure, natural goodness.",
    highlights: SHARED_HIGHLIGHTS,
    ingredients: "Blueberries, Cane sugar, Lemon juice, and Water",
    netWeight: "12 oz | 340 g",
    storage: "Refrigerate after opening",
    nutrition: SHARED_NUTRITION,
  },
  {
    code: "RASP",
    name: "Raspberry",
    handle: "raspberry-jam",
    subtitle: "Tart raspberry jam with vibrant, tangy flavor",
    description:
      BRAND_STORY +
      "For the sophisticated palate, Tam's Raspberry Jam is a revelation. Tart, vibrant, and bursting with the complex flavor that only real raspberries can deliver, this jam elevates everything it touches. The tartness cuts through sweetness with elegance—no cloying aftertaste, just pure raspberry intensity.\n\nThis is a premium preserve for those who appreciate nuance. Use it in French pastries, swirl into dark chocolate ganache, or pair with artisanal cheese boards. At 35 calories per serving, it's light enough to enjoy generously, yet bold enough to make a statement on your favorite crackers or warm croissants.\n\n100% real raspberries, no shortcuts. Naturally vegan, vegetarian, and gluten-free. Small-batch crafted by Tam with the precision of an artisan who refuses to compromise. A jam for those who know the difference between ordinary and exceptional.",
    highlights: SHARED_HIGHLIGHTS,
    ingredients: "Raspberries, Cane sugar, Lemon juice, and Water",
    netWeight: "12 oz | 340 g",
    storage: "Refrigerate after opening",
    nutrition: SHARED_NUTRITION,
  },
  {
    code: "APPLE",
    name: "Apple",
    handle: "apple-jam",
    subtitle: "Classic apple jam with smooth, mellow sweetness",
    description:
      BRAND_STORY +
      "Apple Jam is comfort in a jar. Smooth, mellow, and endlessly versatile, this classic flavor brings the warmth of homemade goodness to your table. Made from crisp, flavorful apples with just the right touch of sweetness, it's the jam that belongs in every kitchen.\n\nWhether you're spreading it on warm toast at breakfast, using it as a base for old-fashioned coffee cake, or swirling it into vanilla yogurt for an afternoon snack, Apple Jam delivers pure, familiar satisfaction. At just 35 calories per serving, it's the light, naturally sweet flavor your whole family will love.\n\n100% real apples, pure cane sugar, and nothing else. No artificial flavors, no preservatives, no added colors. Naturally suitable for vegan, vegetarian, and gluten-free diets. Small-batch made by Tam with the warmth and care that defines everything she creates. This is the taste of simple, honest, delicious homemade jam.",
    highlights: SHARED_HIGHLIGHTS,
    ingredients: "Apples, Cane sugar, Lemon juice, and Water",
    netWeight: "12 oz | 340 g",
    storage: "Refrigerate after opening",
    nutrition: SHARED_NUTRITION,
  },
  {
    code: "QUINCE",
    name: "Quince",
    handle: "quince-jam",
    subtitle: "Aromatic quince jam with warm spiced notes",
    description:
      BRAND_STORY +
      "Quince Jam is a treasure—a rare, aromatic preserve that takes you on a culinary journey. Infused with warm cinnamon spice, this specialty jam captures the essence of Old World preserving traditions. Quince itself is increasingly rare to find, making this jam a true discovery for adventurous palates.\n\nThe natural floral notes of quince, balanced with the warmth of cinnamon, create a sophisticated flavor profile that's perfect for gourmet entertaining. Pair with aged cheeses on a charcuterie board, dollop onto roasted duck, or use as an elegant spread for afternoon tea. At 35 calories per serving, every spoonful delivers an extraordinary experience.\n\nThis is a luxury preserve for the connoisseur. 100% real quince, pure cane sugar, and aromatic cinnamon—a blend born from Tam's Armenian heritage and refined by her passion for excellence. No artificial ingredients, no shortcuts, only the finest craftsmanship. A jam that tells a story of tradition, culture, and the bold flavors that shaped a family's journey.",
    highlights: SHARED_HIGHLIGHTS,
    ingredients: "Quince, Cane sugar, Lemon juice, Cinnamon, and Water",
    netWeight: "12 oz | 340 g",
    storage: "Refrigerate after opening",
    nutrition: SHARED_NUTRITION,
  },
  {
    code: "SRCHERRY",
    name: "Sour Cherry",
    handle: "sour-cherry-jam",
    subtitle: "Tart sour cherry jam with bright, complex flavor",
    description:
      BRAND_STORY +
      "Sour Cherry Jam is for the adventurous—those who seek the extraordinary. Bright, tart, and gloriously complex, this jam celebrates the bold character of sour cherries, nature's most sophisticated fruit. It's not timid. It doesn't apologize. It announces itself with every spoonful.\n\nThis is a chef's ingredient. Use it as a glaze for grilled meats, fold it into dark chocolate desserts, or layer it into sophisticated cocktails. On its own, it's a stunning accompaniment to artisanal crackers and premium cheeses. At 35 calories per serving, you get pure, unapologetic cherry intensity without excess.\n\n100% real sour cherries, pure cane sugar, crafted by hand. No artificial flavors, no shortcuts, no concessions to mass-market tastes. Naturally vegan, vegetarian, and gluten-free. This is a jam made for people who know what they want and refuse to settle for ordinary. A taste of boldness, heritage, and uncompromising quality.",
    highlights: SHARED_HIGHLIGHTS,
    ingredients: "Sour Cherry, Cane sugar, Lemon juice, and Water",
    netWeight: "12 oz | 340 g",
    storage: "Refrigerate after opening",
    nutrition: SHARED_NUTRITION,
  },
];

interface SizeSpec {
  code: "SMALL" | "MEDIUM" | "LARGE";
  title: string;
  ounces: number;
  grams: number;
  priceUsd: number;
  inventoryQty: number;
}

const SIZES: SizeSpec[] = [
  { code: "SMALL", title: "Small", ounces: 8, grams: 227, priceUsd: 14.89, inventoryQty: 100 },
  { code: "MEDIUM", title: "Medium", ounces: 12, grams: 340, priceUsd: 22.89, inventoryQty: 100 },
  { code: "LARGE", title: "Large", ounces: 18, grams: 510, priceUsd: 33.89, inventoryQty: 100 },
];

function skuFor(flavor: FlavorSpec, size: SizeSpec): string {
  return `TJ-${flavor.code}-${size.code}`;
}

function imageUrlFor(flavor: FlavorSpec): string {
  return `${IMAGE_BASE_PATH}/${flavor.handle}.jpg`;
}

export default async function catalog_seed({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: PRODUCT_HANDLE },
  });

  if (existingProducts.length) {
    logger.info(
      `Product "${PRODUCT_HANDLE}" already exists (${existingProducts[0].id}). Skipping catalog seed.`
    );
    return;
  }

  logger.info("Ensuring TamJams stock location exists...");
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    filters: { name: STOCK_LOCATION_NAME },
  });

  let stockLocationId: string;
  if (existingLocations.length) {
    stockLocationId = existingLocations[0].id;
  } else {
    const {
      result: [stockLocation],
    } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: STOCK_LOCATION_NAME }] },
    });
    stockLocationId = stockLocation.id;

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocationId, add: [SALES_CHANNEL_ID] },
    });
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
    filters: { name: DEFAULT_SHIPPING_PROFILE_NAME },
  });
  const shippingProfileId = shippingProfiles[0]?.id;

  logger.info("Creating TamJams Jar product with Flavor x Size variants...");

  const variantsInput = FLAVORS.flatMap((flavor) =>
    SIZES.map((size) => ({
      title: `${flavor.name} - ${size.title}`,
      sku: skuFor(flavor, size),
      manage_inventory: true,
      weight: size.grams,
      options: { Flavor: flavor.name, Size: size.title },
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
    }))
  );

  const {
    result: [product],
  } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "TamJams Jar",
          handle: PRODUCT_HANDLE,
          status: ProductStatus.PUBLISHED,
          subtitle: "Small-batch, real-fruit jams in 7 flavors and 3 sizes",
          description:
            BRAND_STORY +
            "The TamJams Jar comes in seven real-fruit flavors — Apricot, Strawberry, Blueberry, Raspberry, Apple, Quince, and Sour Cherry — each made with 100% real fruit and pure cane sugar, with no artificial flavors, preservatives, or additives. Available in three sizes: Small (8 oz), Medium (12 oz), and Large (18 oz). Naturally vegetarian, vegan, and gluten-free. Non-GMO, small-batch made. Refrigerate after opening.",
          images: FLAVORS.map((flavor) => ({ url: imageUrlFor(flavor) })),
          thumbnail: imageUrlFor(FLAVORS[0]),
          shipping_profile_id: shippingProfileId,
          options: [
            { title: "Flavor", values: FLAVORS.map((flavor) => flavor.name) },
            { title: "Size", values: SIZES.map((size) => size.title) },
          ],
          variants: variantsInput,
          sales_channels: [{ id: SALES_CHANNEL_ID }],
        },
      ],
    },
  });

  logger.info("Linking flavor images to their variants...");
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

  for (const flavor of FLAVORS) {
    const imageId = imageIdByUrl.get(imageUrlFor(flavor));
    if (!imageId) continue;

    for (const size of SIZES) {
      const variantId = variantIdBySku.get(skuFor(flavor, size));
      if (!variantId) continue;

      await batchVariantImagesWorkflow(container).run({
        input: { variant_id: variantId, add: [imageId] },
      });
    }
  }

  logger.info("Setting inventory levels...");
  const skus = FLAVORS.flatMap((flavor) => SIZES.map((size) => skuFor(flavor, size)));
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

  const inventory_levels = FLAVORS.flatMap((flavor) =>
    SIZES.map((size) => {
      const sku = skuFor(flavor, size);
      const inventoryItemId = inventoryItemIdBySku.get(sku);
      if (!inventoryItemId) {
        throw new Error(`Missing inventory item for SKU ${sku}`);
      }
      return {
        inventory_item_id: inventoryItemId,
        location_id: stockLocationId,
        stocked_quantity: size.inventoryQty,
      };
    })
  );

  await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels } });

  const summary = FLAVORS.flatMap((flavor) =>
    SIZES.map((size) => ({
      flavor: flavor.name,
      size: size.title,
      sku: skuFor(flavor, size),
      price_usd: size.priceUsd.toFixed(2),
      qty: size.inventoryQty,
    }))
  );

  console.table(summary);
  logger.info(
    `Catalog seed complete: ${summary.length} variants (${FLAVORS.length} flavors x ${SIZES.length} sizes) created for product "${product.handle}" (${product.id}).`
  );
}
