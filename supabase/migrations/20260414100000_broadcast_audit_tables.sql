-- Migration: 20260414100000_broadcast_audit_tables.sql
-- Description: Adds broadcast_messages and broadcast_deliveries tables for auditable broadcast system.
--              Also adds broadcast_id FK to notifications and a delete policy for notifications.

-- 1. Broadcast Messages (audit root — one row per broadcast sent)
CREATE TABLE broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    type TEXT NOT NULL CHECK (type IN ('system_announcement', 'maintenance', 'promo', 'security')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Broadcast Deliveries (per-user delivery tracking)
CREATE TABLE broadcast_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broadcast_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    in_app_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    push_queued_at TIMESTAMPTZ,
    push_sent_at TIMESTAMPTZ,
    push_failed_at TIMESTAMPTZ,
    push_error TEXT,
    UNIQUE(broadcast_id, user_id)
);

-- 3. Add broadcast_id FK to notifications for tracing broadcast notifications back to their source
ALTER TABLE notifications ADD COLUMN broadcast_id UUID REFERENCES broadcast_messages(id) ON DELETE SET NULL;

-- 4. Indexes for common query patterns
CREATE INDEX idx_broadcast_deliveries_broadcast ON broadcast_deliveries(broadcast_id);
CREATE INDEX idx_broadcast_deliveries_user ON broadcast_deliveries(user_id);
CREATE INDEX idx_notifications_broadcast ON notifications(broadcast_id) WHERE broadcast_id IS NOT NULL;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

-- 5. RLS Policies

-- broadcast_messages: admin-only read, service_role inserts
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcast history"
ON broadcast_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- broadcast_deliveries: admin-only read
ALTER TABLE broadcast_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view delivery details"
ON broadcast_deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- notifications: users can delete their own notifications (was missing)
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (user_id = auth.uid());
