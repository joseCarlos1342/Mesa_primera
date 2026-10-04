BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL ROLE postgres;
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
SET LOCAL search_path = public, extensions;

SELECT plan(23);

SELECT ok(
  has_function_privilege('authenticated', 'public.get_bonus_status(uuid)', 'EXECUTE'),
  'authenticated puede consultar su propio estado de bono'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_bonus_status(uuid)', 'EXECUTE'),
  'anon no puede consultar estado de bonos'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.get_user_balance(uuid)', 'EXECUTE'),
  'authenticated puede consultar su propio saldo'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_user_balance(uuid)', 'EXECUTE'),
  'anon no puede consultar saldos'
);
SELECT ok(
  position('IS DISTINCT FROM auth.uid()' IN pg_get_functiondef('public.get_user_balance(uuid)'::regprocedure)) > 0,
  'get_user_balance vincula el UUID solicitado con auth.uid()'
);
SELECT ok(
  position('p_user_id IS NOT NULL' IN pg_get_functiondef('public.get_bonus_status(uuid)'::regprocedure)) > 0,
  'get_bonus_status valida el UUID solicitado antes de leer datos'
);
SELECT ok(
  position('aal2' IN pg_get_functiondef('public.admin_adjust_user_balance(uuid,integer,text)'::regprocedure)) > 0,
  'admin_adjust_user_balance exige AAL2 en la base de datos'
);
SELECT ok(
  position('aal2' IN pg_get_functiondef('public.process_admin_transaction(uuid,text)'::regprocedure)) > 0,
  'process_admin_transaction exige AAL2 en la base de datos'
);
SELECT ok(
  position('IF p_role' IN pg_get_functiondef('public.close_support_ticket(uuid,text)'::regprocedure)) = 0,
  'close_support_ticket no confía en el rol enviado por el cliente'
);
SELECT ok(
  position('p_from_admin OR' IN pg_get_functiondef('public.append_support_message(uuid,text,boolean)'::regprocedure)) = 0,
  'append_support_message no permite forzar autoría admin'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.append_support_message(uuid,text,boolean)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.close_support_ticket(uuid,text)', 'EXECUTE'),
  'anon no puede invocar RPCs de soporte'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.append_support_message(uuid,text,boolean)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.close_support_ticket(uuid,text)', 'EXECUTE'),
  'authenticated puede invocar RPCs de soporte con sesión'
);
SELECT ok(
  NOT has_function_privilege('service_role', 'public.append_support_message(uuid,text,boolean)', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.close_support_ticket(uuid,text)', 'EXECUTE'),
  'service_role no recibe una superficie RPC de soporte innecesaria'
);
SELECT ok(
  position('v_role := CASE WHEN v_is_admin' IN pg_get_functiondef('public.close_support_ticket(uuid,text)'::regprocedure)) > 0,
  'close_support_ticket deriva el rol desde is_admin()'
);
SELECT ok(
  position('v_from := CASE WHEN v_is_admin' IN pg_get_functiondef('public.append_support_message(uuid,text,boolean)'::regprocedure)) > 0,
  'append_support_message deriva la autoría desde is_admin()'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'games_server_insert'
      AND cmd = 'INSERT'
      AND roles = ARRAY['service_role']::name[]
  ),
  'games_server_insert queda limitado a service_role'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'games_server_update'
      AND cmd = 'UPDATE'
      AND roles = ARRAY['service_role']::name[]
  ),
  'games_server_update queda limitado a service_role'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tables'
      AND policyname = 'tables_server_insert'
      AND cmd = 'INSERT'
      AND roles = ARRAY['service_role']::name[]
  ),
  'tables_server_insert queda limitado a service_role'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tables'
      AND policyname = 'Users can create tables'
  ),
  'los jugadores no crean mesas directamente'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.games', 'INSERT'),
  'anon no tiene INSERT directo sobre games'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.games', 'INSERT'),
  'authenticated no tiene INSERT directo sobre games'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.tables', 'INSERT'),
  'anon no tiene INSERT directo sobre tables'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.tables', 'INSERT'),
  'authenticated no tiene INSERT directo sobre tables'
);

SELECT * FROM finish();
ROLLBACK;
