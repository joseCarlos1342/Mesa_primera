-- Migration: Initial Schema for Mesa Primera
-- Creates 15 core tables, relationships and basic RLS policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_devices (Anti-fraud)
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  device_id TEXT NOT NULL,
  fingerprint JSONB,
  is_trusted BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- 3. friendships
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 4. player_stats
CREATE TABLE public.player_stats (
  user_id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  total_games INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  total_winnings NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0 CHECK (balance >= 0),
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. transactions (Ledger)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES public.wallets(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'refund')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id UUID, -- could point to game_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. tables (Game Rooms)
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  min_bet NUMERIC DEFAULT 1,
  max_players INT DEFAULT 4,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. games (Matches sessions)
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES public.tables(id) NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. game_participants
CREATE TABLE public.game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  seat_number INT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(game_id, user_id)
);

-- 10. game_rounds
CREATE TABLE public.game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) NOT NULL,
  round_number INT NOT NULL,
  pot_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. game_actions
CREATE TABLE public.game_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES public.game_rounds(id) NOT NULL,
  game_id UUID REFERENCES public.games(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  action_type TEXT NOT NULL, -- bet, fold, call, etc.
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. tournaments
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  buy_in NUMERIC NOT NULL,
  prize_pool_guaranteed NUMERIC,
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'registering' CHECK (status IN ('registering', 'running', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. tournament_participants
CREATE TABLE public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- 14. admin_audit_log
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. chat_messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- RLS Configuration

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Note: In a real app we would create policies for admins 
-- (assuming an admin flag exists in `user_roles` or JWT metadata).
-- For this sprint we are adding basic policies for normal users.

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public stats" 
ON public.player_stats FOR SELECT USING (true);

CREATE POLICY "Users can view active tables" 
ON public.tables FOR SELECT USING (is_active = true);

CREATE POLICY "Users can see wallets but only their own balance" 
ON public.wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin full access (bypass RLS demo)"
ON public.profiles FOR ALL USING (
  -- In production check JWT claims for admin role
  true -- To allow admin server to bypass, or via service role key
);
