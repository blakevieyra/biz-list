-- Saved / interested items — generic bookmarks for listings, events, collaborations, proposals, contracts
CREATE TABLE IF NOT EXISTS saved_items (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type  text        NOT NULL CHECK (item_type IN ('listing', 'event', 'collaboration', 'post', 'contract', 'proposal', 'person')),
  item_id    text        NOT NULL,
  item_title text        NOT NULL DEFAULT '',
  item_subtitle text,
  item_url   text,
  saved_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved items"
  ON saved_items
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_items_user_idx ON saved_items (user_id, saved_at DESC);
