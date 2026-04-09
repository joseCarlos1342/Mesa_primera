-- Migration: Corregir búsqueda de teléfono en lookup_user_by_phone y check_phone_exists
--
-- Problema: Supabase/GoTrue puede almacenar el teléfono con o sin el prefijo '+'.
-- El frontend normaliza a formato E.164 (+57...), pero auth.users puede tenerlo
-- como '57...' (sin +). Las funciones anteriores hacían comparación exacta y fallaban.
--
-- Solución: Buscar tanto el valor exacto como la variante sin '+'.

-- 1. Corregir check_phone_exists
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
  );
END;
$$;

-- 2. Corregir lookup_user_by_phone
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
BEGIN
  -- Validar input
  IF p_phone IS NULL OR length(trim(p_phone)) < 6 THEN
    RETURN jsonb_build_object('found', false, 'error', 'Número de teléfono inválido');
  END IF;

  v_phone_clean := regexp_replace(trim(p_phone), '^\+', '');

  -- Buscar en auth.users por teléfono (con o sin '+')
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE phone = trim(p_phone)
     OR phone = v_phone_clean
  LIMIT 1;

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
