alter table public.accounts
  add column if not exists supabase_auth_user_id uuid,
  add column if not exists auth_provider text not null default 'legacy'
    check (auth_provider in ('legacy', 'google', 'magic_link', 'email_password', 'email_otp', 'unknown')),
  add column if not exists last_login_at timestamptz;

create unique index if not exists idx_accounts_supabase_auth_user_id
  on public.accounts(supabase_auth_user_id)
  where supabase_auth_user_id is not null;

alter table public.agents
  add column if not exists lifecycle_state text,
  add column if not exists bootstrap_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists bootstrap_expires_at timestamptz,
  add column if not exists connected_at timestamptz,
  add column if not exists claimed_at timestamptz;

update public.agents
set lifecycle_state = case
  when claimed = true then 'claimed'
  when claim_code is not null then 'recovery_pending'
  else 'connected_unclaimed'
end
where lifecycle_state is null;

update public.agents
set connected_at = coalesce(connected_at, created_at)
where connected_at is null;

update public.agents
set claimed_at = coalesce(claimed_at, updated_at, created_at)
where claimed = true and claimed_at is null;

alter table public.agents
  alter column lifecycle_state set default 'claimed';

alter table public.agents
  alter column lifecycle_state set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_lifecycle_state_check'
  ) then
    alter table public.agents
      add constraint agents_lifecycle_state_check
      check (lifecycle_state in ('sandbox', 'connected_unclaimed', 'claimed', 'recovery_pending'));
  end if;
end $$;

create index if not exists idx_agents_lifecycle_state
  on public.agents(lifecycle_state);

create index if not exists idx_agents_bootstrap_account_id
  on public.agents(bootstrap_account_id, lifecycle_state, created_at desc)
  where bootstrap_account_id is not null;
