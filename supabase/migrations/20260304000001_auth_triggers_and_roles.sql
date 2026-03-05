-- Migration: Auth Triggers and User Roles
-- Adds roles to profiles and automates profile/wallet creation on signup

-- 1. Add role to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('player', 'admin');
  END IF;
END $$;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'player';

-- 2. Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.phone, NEW.email), 
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'player')
  );

  -- Create wallet
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);

  -- Initial player stats
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
