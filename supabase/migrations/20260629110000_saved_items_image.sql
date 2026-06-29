ALTER TABLE saved_items
  ADD COLUMN IF NOT EXISTS item_image_url TEXT,
  ADD COLUMN IF NOT EXISTS item_description TEXT;
