-- Migration: Create missing core tables identified in Master Plan but missing from SQL migrations
-- This fix is required because subsequent migrations expect these tables.

-- 1. DEPOSIT_REQUESTS
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount_cents INT NOT NULL,
    proof_image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WITHDRAWAL_REQUESTS
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount_cents INT NOT NULL,
    destination_type TEXT,
    destination_account TEXT,
    destination_holder_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    name_match_verified BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LEDGER (Inmutable record)
CREATE TABLE IF NOT EXISTS public.ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    game_id UUID REFERENCES public.games(id),
    counterpart_id UUID REFERENCES public.profiles(id),
    type TEXT,
    direction TEXT CHECK (direction IN ('credit', 'debit')),
    amount_cents INT NOT NULL,
    balance_before_cents INT,
    balance_after_cents INT,
    description TEXT,
    reference_id TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for missing tables
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deposits" ON public.deposit_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposits" ON public.deposit_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own withdrawals" ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawals" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ledger entries" ON public.ledger
  FOR SELECT USING (auth.uid() = user_id);
