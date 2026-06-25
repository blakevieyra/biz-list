-- Business page view tracking
CREATE TABLE IF NOT EXISTS business_page_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  viewer_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_page_views_business_viewed
  ON business_page_views(business_id, viewed_at DESC);

-- Business offering button click tracking
CREATE TABLE IF NOT EXISTS business_offering_clicks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  offering_name text NOT NULL,
  click_type    text NOT NULL,
  clicker_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  clicked_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_offering_clicks_business_clicked
  ON business_offering_clicks(business_id, clicked_at DESC);

-- RLS: owners can read their own analytics; inserts are open (tracking)
ALTER TABLE business_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_offering_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read page views"
  ON business_page_views FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert page view"
  ON business_page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners read offering clicks"
  ON business_offering_clicks FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert offering click"
  ON business_offering_clicks FOR INSERT
  WITH CHECK (true);
