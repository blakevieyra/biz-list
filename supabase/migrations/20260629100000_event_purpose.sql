-- Add purpose column to business_events for event-type filtering
ALTER TABLE business_events
  ADD COLUMN IF NOT EXISTS purpose TEXT;
