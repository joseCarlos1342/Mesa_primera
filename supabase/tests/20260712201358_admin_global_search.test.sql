BEGIN;

SELECT plan(4);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-00000000a201', 'authenticated', 'authenticated', 'global-search-admin@example.test', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000a202', 'authenticated', 'authenticated', 'global-search-owner@example.test', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000a203', 'authenticated', 'authenticated', 'global-search-outsider@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES
  ('00000000-0000-0000-0000-00000000a201', 'global_search_admin', 'admin'),
  ('00000000-0000-0000-0000-00000000a202', 'global_search_owner', 'player'),
  ('00000000-0000-0000-0000-00000000a203', 'global_search_outsider', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.deposit_requests (id, user_id, amount_cents, status)
VALUES ('00000000-0000-0000-0000-00000000a211', '00000000-0000-0000-0000-00000000a202', 100000, 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.withdrawal_requests (id, user_id, amount_cents, status)
VALUES ('00000000-0000-0000-0000-00000000a212', '00000000-0000-0000-0000-00000000a202', 100000, 'approved')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a201', true);

SELECT is(
  (SELECT count(*)::int FROM public.deposit_requests WHERE id = '00000000-0000-0000-0000-00000000a211'),
  1,
  'Un admin puede investigar un depósito histórico'
);

SELECT is(
  (SELECT count(*)::int FROM public.withdrawal_requests WHERE id = '00000000-0000-0000-0000-00000000a212'),
  1,
  'Un admin puede investigar un retiro histórico'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a203', true);

SELECT is(
  (SELECT count(*)::int FROM public.deposit_requests WHERE id = '00000000-0000-0000-0000-00000000a211'),
  0,
  'Un jugador ajeno no ve depósitos de terceros'
);

SELECT is(
  (SELECT count(*)::int FROM public.withdrawal_requests WHERE id = '00000000-0000-0000-0000-00000000a212'),
  0,
  'Un jugador ajeno no ve retiros de terceros'
);

SELECT * FROM finish();
ROLLBACK;
