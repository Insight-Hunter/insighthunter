ALTER TABLE billing_events
  ADD COLUMN processed_at INTEGER;

ALTER TABLE billing_events
  ADD COLUMN processing_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS billing_events_stripe_event_id_unique
  ON billing_events (stripe_event_id);

CREATE INDEX IF NOT EXISTS billing_events_unprocessed_idx
  ON billing_events (processed_at)
  WHERE processed_at IS NULL;
