import { HARDCODED_SALES_CHANNEL_ID, sql } from "./env.mjs"

/**
 * Idempotent, additive-only local-DB fixups.
 *
 * The three repo seeds were written against the production database and two of
 * them hardcode the production sales-channel id. On any other database that id
 * does not exist, and a DB that already carries the Medusa demo seed (this
 * machine's) additionally lacks a US region and has demo shipping options that
 * make shipping-seed short-circuit. Everything below is `ON CONFLICT DO
 * NOTHING` / WHERE NOT EXISTS inserts — no rows are updated or deleted, except
 * assigning the previously-unassigned `us` row in region_country.
 */

export function preMigrateFixups() {
  // Must exist BEFORE `medusa db:migrate` runs catalog-seed/shipping-seed,
  // both of which link to this exact id.
  sql(`
    INSERT INTO sales_channel (id, name, description)
    VALUES ('${HARDCODED_SALES_CHANNEL_ID}', 'TamJams Storefront', 'E2E: pre-created so seeds hardcoding the prod channel id link cleanly')
    ON CONFLICT (id) DO NOTHING;
  `)
  console.log("[e2e] pre-migrate fixups applied (TamJams sales channel present)")
}

export function postMigrateFixups() {
  // 1. Link the jar product + TamJams warehouse to every sales channel, so
  //    key scoping and cart inventory checks pass no matter which channel a
  //    cart lands on. NOTE: keys must keep exactly ONE channel each —
  //    `+variants.inventory_quantity` 400s when the publishable key resolves
  //    to multiple sales channels.
  sql(`
    INSERT INTO product_sales_channel (id, product_id, sales_channel_id)
    SELECT 'prodsc_e2e_' || substr(md5(p.id || sc.id), 1, 20), p.id, sc.id
    FROM product p CROSS JOIN sales_channel sc
    WHERE p.handle = 'tamjams-jar' AND p.deleted_at IS NULL AND sc.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM product_sales_channel x
        WHERE x.product_id = p.id AND x.sales_channel_id = sc.id AND x.deleted_at IS NULL
      );

    INSERT INTO sales_channel_stock_location (id, sales_channel_id, stock_location_id)
    SELECT 'scloc_e2e_' || substr(md5(sc.id || sl.id), 1, 20), sc.id, sl.id
    FROM sales_channel sc CROSS JOIN stock_location sl
    WHERE sl.name = 'TamJams Warehouse' AND sc.deleted_at IS NULL AND sl.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM sales_channel_stock_location x
        WHERE x.sales_channel_id = sc.id AND x.stock_location_id = sl.id AND x.deleted_at IS NULL
      );
  `)

  // 2. US / USD region with the system (manual) payment provider.
  sql(`
    INSERT INTO region (id, name, currency_code, automatic_taxes)
    VALUES ('reg_e2e_us', 'United States', 'usd', true)
    ON CONFLICT (id) DO NOTHING;

    UPDATE region_country SET region_id = 'reg_e2e_us'
    WHERE iso_2 = 'us' AND region_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM region r JOIN region_country rc ON rc.region_id = r.id
        WHERE rc.iso_2 = 'us' AND r.deleted_at IS NULL
      );

    INSERT INTO region_payment_provider (id, region_id, payment_provider_id)
    SELECT 'regpp_e2e_us', 'reg_e2e_us', 'pp_system_default'
    WHERE EXISTS (SELECT 1 FROM region_country WHERE iso_2 = 'us' AND region_id = 'reg_e2e_us')
      AND NOT EXISTS (
        SELECT 1 FROM region_payment_provider
        WHERE region_id = 'reg_e2e_us' AND payment_provider_id = 'pp_system_default' AND deleted_at IS NULL
      );
  `)

  // 3. US fulfillment: the demo seed left European shipping options behind,
  //    which makes shipping-seed short-circuit before creating the US option.
  //    Mirror exactly what shipping-seed would have created: fulfillment set +
  //    US service zone on the TamJams Warehouse, manual provider link, and the
  //    flat $5.00 "Standard Shipping" option (decimal dollars, store-enabled).
  sql(`
    DO $$
    DECLARE
      loc_id text;
    BEGIN
      SELECT id INTO loc_id FROM stock_location
      WHERE name = 'TamJams Warehouse' AND deleted_at IS NULL LIMIT 1;
      IF loc_id IS NULL THEN
        RAISE EXCEPTION 'TamJams Warehouse not found - did catalog-seed run?';
      END IF;

      IF EXISTS (
        SELECT 1 FROM shipping_option so
        JOIN service_zone sz ON sz.id = so.service_zone_id
        JOIN geo_zone gz ON gz.service_zone_id = sz.id
        WHERE so.name = 'Standard Shipping' AND gz.country_code = 'us'
          AND so.deleted_at IS NULL
      ) THEN
        RETURN;
      END IF;

      INSERT INTO location_fulfillment_provider (id, stock_location_id, fulfillment_provider_id)
      SELECT 'locfp_e2e_us', loc_id, 'manual_manual'
      WHERE NOT EXISTS (
        SELECT 1 FROM location_fulfillment_provider
        WHERE stock_location_id = loc_id AND fulfillment_provider_id = 'manual_manual' AND deleted_at IS NULL
      );

      INSERT INTO fulfillment_set (id, name, type)
      VALUES ('fuset_e2e_us', 'TamJams US Delivery', 'shipping')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO location_fulfillment_set (id, stock_location_id, fulfillment_set_id)
      SELECT 'locfs_e2e_us', loc_id, 'fuset_e2e_us'
      WHERE NOT EXISTS (
        SELECT 1 FROM location_fulfillment_set
        WHERE stock_location_id = loc_id AND fulfillment_set_id = 'fuset_e2e_us' AND deleted_at IS NULL
      );

      INSERT INTO service_zone (id, name, fulfillment_set_id)
      VALUES ('serzo_e2e_us', 'United States', 'fuset_e2e_us')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO geo_zone (id, type, country_code, service_zone_id)
      VALUES ('fgz_e2e_us', 'country', 'us', 'serzo_e2e_us')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO shipping_option_type (id, label, description, code)
      VALUES ('sotype_e2e_us', 'Standard', 'Ships in 2-3 business days.', 'standard')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO shipping_option (id, name, price_type, service_zone_id, shipping_profile_id, provider_id, shipping_option_type_id)
      SELECT 'so_e2e_us', 'Standard Shipping', 'flat', 'serzo_e2e_us', sp.id, 'manual_manual', 'sotype_e2e_us'
      FROM shipping_profile sp
      WHERE sp.name = 'Default Shipping Profile' AND sp.deleted_at IS NULL
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO shipping_option_rule (id, attribute, operator, value, shipping_option_id) VALUES
        ('sorul_e2e_us_store', 'enabled_in_store', 'eq', '"true"'::jsonb, 'so_e2e_us'),
        ('sorul_e2e_us_return', 'is_return', 'eq', '"false"'::jsonb, 'so_e2e_us')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO price_set (id) VALUES ('pset_e2e_us') ON CONFLICT (id) DO NOTHING;

      INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count)
      VALUES ('price_e2e_us', 'pset_e2e_us', 'usd', 5, '{"value": "5", "precision": 20}'::jsonb, 0)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO shipping_option_price_set (id, shipping_option_id, price_set_id)
      SELECT 'sops_e2e_us', 'so_e2e_us', 'pset_e2e_us'
      WHERE NOT EXISTS (
        SELECT 1 FROM shipping_option_price_set
        WHERE shipping_option_id = 'so_e2e_us' AND price_set_id = 'pset_e2e_us' AND deleted_at IS NULL
      );
    END $$;
  `)

  console.log("[e2e] post-migrate fixups applied (channel links, US region, US shipping)")
}
