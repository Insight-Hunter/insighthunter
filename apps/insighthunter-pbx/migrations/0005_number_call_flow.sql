-- Routes inbound calls on a number to a published call flow. NULL keeps the
-- legacy voicemail behaviour.
ALTER TABLE phone_numbers ADD COLUMN call_flow_id INTEGER REFERENCES call_flows(id);
