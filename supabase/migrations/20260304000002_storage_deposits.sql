-- Migration: Storage for Deposits
-- Creates buckets for deposit proofs and RLS policies

INSERT INTO storage.buckets (id, name, public) 
VALUES ('deposits', 'deposits', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for deposits bucket
CREATE POLICY "Users can upload their own proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deposits' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'deposits' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view ALL proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposits' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
