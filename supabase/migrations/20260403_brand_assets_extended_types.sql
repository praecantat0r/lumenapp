-- Expand brand_assets.type check constraint to include AI-classified asset categories.
-- The original constraint only allowed: photo, logo, icon, other
-- New values: product_photo, place_photo, label

ALTER TABLE brand_assets
  DROP CONSTRAINT IF EXISTS brand_assets_type_check;

ALTER TABLE brand_assets
  ADD CONSTRAINT brand_assets_type_check
  CHECK (type IN ('photo', 'logo', 'icon', 'other', 'product_photo', 'place_photo', 'label'));
