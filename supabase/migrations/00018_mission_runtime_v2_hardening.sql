create table if not exists mountain_memberships (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  role text not null check (role in ('operator', 'participant', 'reviewer', 'verifier', 'official_bot')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (account_id is not null or agent_id is not null)
);

create unique index if not exists mountain_memberships_account_uidx
  on mountain_memberships(mountain_id, account_id, role)
  where account_id is not null;

create unique index if not exists mountain_memberships_agent_uidx
  on mountain_memberships(mountain_id, agent_id, role)
  where agent_id is not null;

create table if not exists mountain_external_targets (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  provider text not null,
  target_slug text not null,
  official_agent_id uuid references agents(id) on delete set null,
  rules_snapshot jsonb not null default '{}'::jsonb,
  submission_policy jsonb not null default '{}'::jsonb,
  disclosure_policy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (mountain_id, provider, target_slug)
);

create index if not exists mountain_memberships_account_status_idx
  on mountain_memberships(account_id, status, mountain_id);
create index if not exists mountain_memberships_agent_status_idx
  on mountain_memberships(agent_id, status, mountain_id);
create index if not exists mountain_external_targets_provider_slug_idx
  on mountain_external_targets(provider, target_slug);
create index if not exists mountain_external_targets_official_agent_idx
  on mountain_external_targets(official_agent_id);
create index if not exists work_leases_checkpoint_due_idx
  on work_leases(status, checkpoint_due_at)
  where checkpoint_due_at is not null;
create index if not exists deliverables_mountain_created_idx
  on deliverables(mountain_id, created_at desc);
create index if not exists verification_runs_deliverable_idx
  on verification_runs(deliverable_id, outcome);

create or replace function public.validate_work_spec_lineage()
returns trigger
language plpgsql
as $$
declare
  v_campaign_mountain uuid;
  v_parent_mountain uuid;
begin
  if new.campaign_id is not null then
    select mountain_id into v_campaign_mountain from campaigns where id = new.campaign_id;
    if v_campaign_mountain is null or v_campaign_mountain <> new.mountain_id then
      raise exception 'work spec campaign must belong to the same mountain';
    end if;
  end if;

  if new.parent_work_spec_id is not null then
    select mountain_id into v_parent_mountain from work_specs where id = new.parent_work_spec_id;
    if v_parent_mountain is null or v_parent_mountain <> new.mountain_id then
      raise exception 'parent work spec must belong to the same mountain';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_work_spec_dependency_lineage()
returns trigger
language plpgsql
as $$
declare
  v_left_mountain uuid;
  v_right_mountain uuid;
begin
  select mountain_id into v_left_mountain from work_specs where id = new.work_spec_id;
  select mountain_id into v_right_mountain from work_specs where id = new.depends_on_work_spec_id;

  if v_left_mountain is null or v_right_mountain is null or v_left_mountain <> v_right_mountain then
    raise exception 'work spec dependencies must stay inside one mountain';
  end if;

  return new;
end;
$$;

create or replace function public.validate_work_lease_lineage()
returns trigger
language plpgsql
as $$
declare
  v_work_spec work_specs%rowtype;
begin
  select * into v_work_spec from work_specs where id = new.work_spec_id;
  if v_work_spec.id is null then
    raise exception 'work lease requires a valid work spec';
  end if;
  if v_work_spec.mountain_id <> new.mountain_id then
    raise exception 'work lease mountain must match work spec mountain';
  end if;
  if new.campaign_id is not null and v_work_spec.campaign_id is not null and new.campaign_id <> v_work_spec.campaign_id then
    raise exception 'work lease campaign must match work spec campaign';
  end if;
  return new;
end;
$$;

create or replace function public.validate_swarm_session_lineage()
returns trigger
language plpgsql
as $$
declare
  v_campaign_mountain uuid;
  v_work_spec_mountain uuid;
begin
  if new.campaign_id is not null then
    select mountain_id into v_campaign_mountain from campaigns where id = new.campaign_id;
    if v_campaign_mountain is null or v_campaign_mountain <> new.mountain_id then
      raise exception 'swarm session campaign must belong to the same mountain';
    end if;
  end if;

  if new.work_spec_id is not null then
    select mountain_id into v_work_spec_mountain from work_specs where id = new.work_spec_id;
    if v_work_spec_mountain is null or v_work_spec_mountain <> new.mountain_id then
      raise exception 'swarm session work spec must belong to the same mountain';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_deliverable_lineage()
returns trigger
language plpgsql
as $$
declare
  v_work_spec work_specs%rowtype;
  v_work_lease work_leases%rowtype;
begin
  if new.work_spec_id is not null then
    select * into v_work_spec from work_specs where id = new.work_spec_id;
    if v_work_spec.id is null or v_work_spec.mountain_id <> new.mountain_id then
      raise exception 'deliverable work spec must belong to the same mountain';
    end if;
    if new.campaign_id is not null and v_work_spec.campaign_id is not null and new.campaign_id <> v_work_spec.campaign_id then
      raise exception 'deliverable campaign must match work spec campaign';
    end if;
  end if;

  if new.work_lease_id is not null then
    select * into v_work_lease from work_leases where id = new.work_lease_id;
    if v_work_lease.id is null or v_work_lease.mountain_id <> new.mountain_id then
      raise exception 'deliverable work lease must belong to the same mountain';
    end if;
    if new.work_spec_id is not null and v_work_lease.work_spec_id <> new.work_spec_id then
      raise exception 'deliverable work lease must match work spec';
    end if;
    if new.campaign_id is not null and v_work_lease.campaign_id is not null and new.campaign_id <> v_work_lease.campaign_id then
      raise exception 'deliverable work lease must match campaign';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_verification_run_lineage()
returns trigger
language plpgsql
as $$
declare
  v_deliverable deliverables%rowtype;
begin
  if new.deliverable_id is not null then
    select * into v_deliverable from deliverables where id = new.deliverable_id;
    if v_deliverable.id is null or v_deliverable.mountain_id <> new.mountain_id then
      raise exception 'verification deliverable must belong to the same mountain';
    end if;
    if new.work_spec_id is not null and v_deliverable.work_spec_id is not null and new.work_spec_id <> v_deliverable.work_spec_id then
      raise exception 'verification work spec must match deliverable work spec';
    end if;
    if new.campaign_id is not null and v_deliverable.campaign_id is not null and new.campaign_id <> v_deliverable.campaign_id then
      raise exception 'verification campaign must match deliverable campaign';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_replan_lineage()
returns trigger
language plpgsql
as $$
declare
  v_work_spec work_specs%rowtype;
  v_work_lease work_leases%rowtype;
begin
  if new.work_spec_id is not null then
    select * into v_work_spec from work_specs where id = new.work_spec_id;
    if v_work_spec.id is null or v_work_spec.mountain_id <> new.mountain_id then
      raise exception 'replan work spec must belong to the same mountain';
    end if;
    if new.campaign_id is not null and v_work_spec.campaign_id is not null and new.campaign_id <> v_work_spec.campaign_id then
      raise exception 'replan campaign must match work spec campaign';
    end if;
  end if;

  if new.work_lease_id is not null then
    select * into v_work_lease from work_leases where id = new.work_lease_id;
    if v_work_lease.id is null or v_work_lease.mountain_id <> new.mountain_id then
      raise exception 'replan work lease must belong to the same mountain';
    end if;
    if new.work_spec_id is not null and v_work_lease.work_spec_id <> new.work_spec_id then
      raise exception 'replan work lease must match work spec';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_reward_split_lineage()
returns trigger
language plpgsql
as $$
declare
  v_work_spec work_specs%rowtype;
  v_work_lease work_leases%rowtype;
  v_deliverable deliverables%rowtype;
begin
  if new.work_spec_id is not null then
    select * into v_work_spec from work_specs where id = new.work_spec_id;
    if v_work_spec.id is null or v_work_spec.mountain_id <> new.mountain_id then
      raise exception 'reward work spec must belong to the same mountain';
    end if;
  end if;

  if new.work_lease_id is not null then
    select * into v_work_lease from work_leases where id = new.work_lease_id;
    if v_work_lease.id is null or v_work_lease.mountain_id <> new.mountain_id then
      raise exception 'reward work lease must belong to the same mountain';
    end if;
    if new.work_spec_id is not null and v_work_lease.work_spec_id <> new.work_spec_id then
      raise exception 'reward work lease must match work spec';
    end if;
  end if;

  if new.deliverable_id is not null then
    select * into v_deliverable from deliverables where id = new.deliverable_id;
    if v_deliverable.id is null or v_deliverable.mountain_id <> new.mountain_id then
      raise exception 'reward deliverable must belong to the same mountain';
    end if;
    if new.work_spec_id is not null and v_deliverable.work_spec_id is not null and v_deliverable.work_spec_id <> new.work_spec_id then
      raise exception 'reward deliverable must match work spec';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  drop trigger if exists trg_validate_work_spec_lineage on public.work_specs;
  create trigger trg_validate_work_spec_lineage
    before insert or update on public.work_specs
    for each row execute function public.validate_work_spec_lineage();

  drop trigger if exists trg_validate_work_spec_dependency_lineage on public.work_spec_dependencies;
  create trigger trg_validate_work_spec_dependency_lineage
    before insert or update on public.work_spec_dependencies
    for each row execute function public.validate_work_spec_dependency_lineage();

  drop trigger if exists trg_validate_work_lease_lineage on public.work_leases;
  create trigger trg_validate_work_lease_lineage
    before insert or update on public.work_leases
    for each row execute function public.validate_work_lease_lineage();

  drop trigger if exists trg_validate_swarm_session_lineage on public.swarm_sessions;
  create trigger trg_validate_swarm_session_lineage
    before insert or update on public.swarm_sessions
    for each row execute function public.validate_swarm_session_lineage();

  drop trigger if exists trg_validate_deliverable_lineage on public.deliverables;
  create trigger trg_validate_deliverable_lineage
    before insert or update on public.deliverables
    for each row execute function public.validate_deliverable_lineage();

  drop trigger if exists trg_validate_verification_run_lineage on public.verification_runs;
  create trigger trg_validate_verification_run_lineage
    before insert or update on public.verification_runs
    for each row execute function public.validate_verification_run_lineage();

  drop trigger if exists trg_validate_replan_lineage on public.replans;
  create trigger trg_validate_replan_lineage
    before insert or update on public.replans
    for each row execute function public.validate_replan_lineage();

  drop trigger if exists trg_validate_reward_split_lineage on public.reward_splits;
  create trigger trg_validate_reward_split_lineage
    before insert or update on public.reward_splits
    for each row execute function public.validate_reward_split_lineage();

  drop trigger if exists trg_set_updated_at_mountain_memberships on public.mountain_memberships;
  create trigger trg_set_updated_at_mountain_memberships
    before update on public.mountain_memberships
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_mountain_external_targets on public.mountain_external_targets;
  create trigger trg_set_updated_at_mountain_external_targets
    before update on public.mountain_external_targets
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_mountains on public.mountains;
  create trigger trg_set_updated_at_mountains
    before update on public.mountains
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_campaigns on public.campaigns;
  create trigger trg_set_updated_at_campaigns
    before update on public.campaigns
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_work_specs on public.work_specs;
  create trigger trg_set_updated_at_work_specs
    before update on public.work_specs
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_work_leases on public.work_leases;
  create trigger trg_set_updated_at_work_leases
    before update on public.work_leases
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_swarm_sessions on public.swarm_sessions;
  create trigger trg_set_updated_at_swarm_sessions
    before update on public.swarm_sessions
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_swarm_session_members on public.swarm_session_members;
  create trigger trg_set_updated_at_swarm_session_members
    before update on public.swarm_session_members
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_deliverables on public.deliverables;
  create trigger trg_set_updated_at_deliverables
    before update on public.deliverables
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_verification_runs on public.verification_runs;
  create trigger trg_set_updated_at_verification_runs
    before update on public.verification_runs
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_replans on public.replans;
  create trigger trg_set_updated_at_replans
    before update on public.replans
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_reward_splits on public.reward_splits;
  create trigger trg_set_updated_at_reward_splits
    before update on public.reward_splits
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_agent_capability_profiles on public.agent_capability_profiles;
  create trigger trg_set_updated_at_agent_capability_profiles
    before update on public.agent_capability_profiles
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_set_updated_at_agent_reputation_scores on public.agent_reputation_scores;
  create trigger trg_set_updated_at_agent_reputation_scores
    before update on public.agent_reputation_scores
    for each row execute function public.set_updated_at();
end;
$$;

alter table public.mountains enable row level security;
alter table public.campaigns enable row level security;
alter table public.work_specs enable row level security;
alter table public.work_spec_dependencies enable row level security;
alter table public.work_leases enable row level security;
alter table public.swarm_sessions enable row level security;
alter table public.swarm_session_members enable row level security;
alter table public.deliverables enable row level security;
alter table public.verification_runs enable row level security;
alter table public.replans enable row level security;
alter table public.reward_splits enable row level security;
alter table public.agent_capability_profiles enable row level security;
alter table public.agent_reputation_scores enable row level security;
alter table public.mountain_memberships enable row level security;
alter table public.mountain_external_targets enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'mountains',
        'campaigns',
        'work_specs',
        'work_spec_dependencies',
        'work_leases',
        'swarm_sessions',
        'swarm_session_members',
        'deliverables',
        'verification_runs',
        'replans',
        'reward_splits',
        'agent_capability_profiles',
        'agent_reputation_scores',
        'mountain_memberships',
        'mountain_external_targets'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

create policy "service_role_full_access_mountains"
  on public.mountains for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_campaigns"
  on public.campaigns for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_work_specs"
  on public.work_specs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_work_spec_dependencies"
  on public.work_spec_dependencies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_work_leases"
  on public.work_leases for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_swarm_sessions"
  on public.swarm_sessions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_swarm_session_members"
  on public.swarm_session_members for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_deliverables"
  on public.deliverables for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_verification_runs"
  on public.verification_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_replans"
  on public.replans for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_reward_splits"
  on public.reward_splits for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_agent_capability_profiles"
  on public.agent_capability_profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_agent_reputation_scores"
  on public.agent_reputation_scores for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_mountain_memberships"
  on public.mountain_memberships for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "service_role_full_access_mountain_external_targets"
  on public.mountain_external_targets for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "anon_read_public_mountains"
  on public.mountains for select
  using (auth.role() = 'anon' and visibility = 'public');

create policy "anon_read_public_campaigns"
  on public.campaigns for select
  using (
    auth.role() = 'anon'
    and exists (
      select 1 from public.mountains m
      where m.id = campaigns.mountain_id
        and m.visibility = 'public'
    )
  );

create policy "anon_read_public_work_specs"
  on public.work_specs for select
  using (
    auth.role() = 'anon'
    and exists (
      select 1 from public.mountains m
      where m.id = work_specs.mountain_id
        and m.visibility = 'public'
    )
  );

create policy "anon_read_public_swarm_sessions"
  on public.swarm_sessions for select
  using (
    auth.role() = 'anon'
    and exists (
      select 1 from public.mountains m
      where m.id = swarm_sessions.mountain_id
        and m.visibility = 'public'
    )
  );

create policy "anon_read_public_deliverables"
  on public.deliverables for select
  using (
    auth.role() = 'anon'
    and coalesce((metadata ->> 'public_safe')::boolean, true)
    and exists (
      select 1 from public.mountains m
      where m.id = deliverables.mountain_id
        and m.visibility = 'public'
    )
  );

create policy "anon_read_public_external_targets"
  on public.mountain_external_targets for select
  using (
    auth.role() = 'anon'
    and exists (
      select 1 from public.mountains m
      where m.id = mountain_external_targets.mountain_id
        and m.visibility = 'public'
    )
  );
