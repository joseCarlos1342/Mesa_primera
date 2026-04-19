create table public.admin_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null,
  code_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  consumed_at timestamptz
);

create index admin_mfa_recovery_codes_active_idx
  on public.admin_mfa_recovery_codes (admin_id)
  where consumed_at is null;

alter table public.admin_mfa_recovery_codes enable row level security;

create policy "Admins manage own recovery codes"
on public.admin_mfa_recovery_codes
for all
using (auth.uid() = admin_id and public.is_admin())
with check (auth.uid() = admin_id and public.is_admin());

comment on table public.admin_mfa_recovery_codes is 'Hashes de recovery codes MFA para administradores. Nunca almacena códigos en texto plano.';