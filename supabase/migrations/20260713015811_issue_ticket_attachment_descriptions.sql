ALTER TABLE public.issue_ticket_attachments
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT 'Sin descripción';

ALTER TABLE public.issue_ticket_attachments
  DROP CONSTRAINT IF EXISTS issue_ticket_attachments_description_length;

ALTER TABLE public.issue_ticket_attachments
  ADD CONSTRAINT issue_ticket_attachments_description_length
  CHECK (char_length(description) BETWEEN 1 AND 1000);
