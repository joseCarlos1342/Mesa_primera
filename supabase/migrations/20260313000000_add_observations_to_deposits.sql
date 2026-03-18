-- Migration: Add observations to deposit and withdrawal requests
-- Adds an optional observations column to track user notes

ALTER TABLE public.deposit_requests 
ADD COLUMN IF NOT EXISTS observations TEXT;

ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS observations TEXT;
