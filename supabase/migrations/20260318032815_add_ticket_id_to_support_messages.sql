-- Migration: add_ticket_id_to_support_messages

ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS ticket_id UUID;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- Update existing messages to group by user_id as a default ticket_id
UPDATE support_messages SET ticket_id = user_id WHERE ticket_id IS NULL;

-- Make it NOT NULL moving forward
ALTER TABLE support_messages ALTER COLUMN ticket_id SET NOT NULL;
