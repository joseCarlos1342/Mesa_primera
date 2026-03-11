-- Migration: 20260310000008_sprint_5_features.sql
-- Description: Adds tables for Replays, Support Chat, Notifications, and Web Push Subscriptions.

-- 1. Game Replays Table
CREATE TABLE game_replays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    round_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    players JSONB NOT NULL,
    timeline JSONB NOT NULL,
    pot_breakdown JSONB NOT NULL,
    final_hands JSONB NOT NULL,
    rng_seed TEXT NOT NULL
);

-- 2. Support Chat Messages
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_admin BOOLEAN NOT NULL DEFAULT false,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 3. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 4. Push Subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Add RLS Policies

-- Game Replays
ALTER TABLE game_replays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view replays of games they participated in" 
ON game_replays FOR SELECT 
USING (
    players @> ANY (ARRAY[(SELECT '[{"userId": "' || auth.uid()::text || '"}]')::jsonb]) 
    OR 
    EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- Support Messages
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own support messages" 
ON support_messages FOR SELECT 
USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "Users can insert their own support messages" 
ON support_messages FOR INSERT 
WITH CHECK (
    user_id = auth.uid()
);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications (e.g., mark as read)" 
ON notifications FOR UPDATE 
USING (user_id = auth.uid());

-- Push Subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their push subscriptions" 
ON push_subscriptions FOR ALL 
USING (user_id = auth.uid());

-- Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
