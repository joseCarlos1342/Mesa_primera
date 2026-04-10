-- Migration: Mejorar lookup_user_by_phone y check_phone_exists para buscar también en profiles.phone
--
-- Problema: El lookup solo buscaba en auth.users.phone. Si el teléfono se guardó
-- con un formato distinto (e.g. +570000000002 vs 570000000002), o si el usuario
-- fue creado por seed/trigger y solo tiene dato en profiles.phone, la búsqueda fallaba.
--
-- Solución: Buscar en auth.users.phone Y en public.profiles.phone, comparando
-- variantes con y sin prefijo +.

-- 1. Mejorar check_phone_exists para buscar en ambas tablas
CREATE OR REPLACE FUNCTION public.check_phone_exists(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone_clean TEXT;
BEGIN
  v_phone_clean := regexp_replace(p_phone, '^\+', '');

  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE phone = p_phone
       OR phone = v_phone_clean
       OR phone = '+' || v_phone_clean
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE phone = p_phone
       OR phone = v_phone_clean
       OR phone = '+' || v_phone_clean
  );
END;
$$;

-- 2. Mejorar lookup_user_by_phone para buscar en auth.users.phone + profiles.phone
CREATE OR REPLACE FUNCTION public.lookup_user_by_phone(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_phone_clean TEXT;
  v_phone_plus TEXT;
BEGIN
  -- Validar input
  IF p_phone IS NULL OR length(trim(p_phone)) < 6 THEN
    RETURN jsonb_build_object('found', false, 'error', 'Número de teléfono inválido');
  END IF;

  v_phone_clean := regexp_replace(trim(p_phone), '^\+', '');
  v_phone_plus  := '+' || v_phone_clean;

  -- 1) Buscar en auth.users por teléfono (con +, sin +, y con + prefijado)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE phone = trim(p_phone)
     OR phone = v_phone_clean
     OR phone = v_phone_plus
  LIMIT 1;

  -- 2) Fallback: buscar en profiles.phone
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE phone = trim(p_phone)
       OR phone = v_phone_clean
       OR phone = v_phone_plus
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- No permitir auto-búsqueda
  IF v_user_id = auth.uid() THEN
    RETURN jsonb_build_object('found', false, 'error', 'No puedes transferirte a ti mismo');
  END IF;

  -- Obtener datos públicos del perfil
  SELECT p.id, p.username, p.avatar_url, p.level
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', v_profile.id,
    'username', v_profile.username,
    'avatar_url', v_profile.avatar_url,
    'level', v_profile.level
  );
END;
$$;
