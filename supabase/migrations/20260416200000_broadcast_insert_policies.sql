-- Migration: 20260416200000_broadcast_insert_policies.sql
-- Fix: Add INSERT RLS policies so admins can create broadcasts via user-session client.
-- The original migration (20260414100000) only had SELECT policies and assumed
-- service_role would handle inserts, but sendBroadcast() uses createClient() (user-session).

-- 1. Admins can INSERT broadcast_messages
CREATE POLICY "Admins can create broadcast messages"
ON broadcast_messages FOR INSERT
WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 2. Admins can INSERT broadcast_deliveries
CREATE POLICY "Admins can create broadcast deliveries"
ON broadcast_deliveries FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 3. Admins can INSERT notifications (for broadcast-created notifications)
CREATE POLICY "Admins can create notifications for broadcasts"
ON notifications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
