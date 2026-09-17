-- Las reglas técnicas viven versionadas en el código. site_settings conserva
-- únicamente normas y avisos operativos editables por el administrador.
UPDATE public.site_settings
SET value = jsonb_build_object(
  'content', '# Anexo operativo del local\n\nEste espacio contiene horarios, avisos y normas operativas del local.\n\nLas reglas técnicas de Primera Riverada, la jerarquía de manos, el cálculo del rake y la resolución de pozos se encuentran en el Reglamento Oficial versionado del producto y no se modifican desde este editor.'
), updated_at = NOW()
WHERE id = 'rulebook'
  AND value->>'content' LIKE '%rake es del 5%';
