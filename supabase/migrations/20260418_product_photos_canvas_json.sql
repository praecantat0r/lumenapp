alter table product_photos
  add column if not exists canvas_json jsonb;
