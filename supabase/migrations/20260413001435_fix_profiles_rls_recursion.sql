-- Fix: RLS infinite recursion on profiles UPDATE policy
--
-- Problem: The WITH CHECK clause in "Users can update own non-sensitive profile data"
-- contains a subquery `SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()`
-- which triggers RLS evaluation on profiles again, causing infinite recursion (42P17).
--
-- Solution: Create a SECURITY DEFINER helper function to read the user's current role
-- bypassing RLS, then reference it in the policy's WITH CHECK clause.

-- 1. Create helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_own_profile_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Replace the recursive policy
DROP POLICY IF EXISTS "Users can update own non-sensitive profile data" ON public.profiles;

CREATE POLICY "Users can update own non-sensitive profile data"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role IS NOT DISTINCT FROM public.get_own_profile_role()
);
