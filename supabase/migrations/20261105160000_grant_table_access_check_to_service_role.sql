-- El game server consulta check_table_access con la service_role al entrar a
-- una mesa. 20260528005000 revocó EXECUTE a service_role y solo lo devolvió a
-- authenticated, así que toda entrada a mesa fallaba con "permission denied"
-- y el servidor la rechazaba (fail-closed) con "No se pudo verificar el acceso".
-- La función ya acepta auth.role() = 'service_role' (20260923011000).

GRANT EXECUTE ON FUNCTION public.check_table_access(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_account_eligibility(UUID) TO service_role;
