BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL ROLE postgres;
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
SET LOCAL search_path = public, extensions;

SELECT plan(9);

SELECT ok(
  to_regclass('public.support_attachments') IS NOT NULL,
  'La tabla de metadatos de adjuntos existe'
);

SELECT ok(
  COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.support_attachments')), false),
  'Los metadatos de adjuntos tienen RLS habilitado'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'support-attachments' AND public = false
  ),
  'El bucket de adjuntos es privado'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload support attachments'
      AND with_check ILIKE '%storage.foldername(name)%auth.uid%'
  ),
  'Los usuarios solo pueden subir adjuntos bajo su propio prefijo'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can view own support attachments'
      AND qual ILIKE '%storage.foldername(name)%auth.uid%'
  ),
  'Los usuarios solo pueden leer sus propios objetos de storage'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can view all support attachments'
      AND qual ILIKE '%is_admin%'
  ),
  'Los administradores tienen acceso explícito a objetos de soporte'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_attachments'
      AND policyname = 'Users can view own ticket attachments'
      AND qual ILIKE '%support_tickets%auth.uid%'
  ),
  'Los usuarios solo pueden leer metadatos de sus propios tickets'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_attachments'
      AND policyname = 'No updates on attachments'
      AND qual ILIKE '%false%'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_attachments'
      AND policyname = 'No deletes on attachments'
      AND qual ILIKE '%false%'
  ),
  'Los metadatos de adjuntos son inmutables'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_attachments'
      AND policyname = 'Users can add attachments to own open tickets'
      AND with_check ILIKE '%status%finalized%'
  ),
  'Los usuarios solo pueden registrar adjuntos en tickets abiertos propios'
);

SELECT * FROM finish();
ROLLBACK;
