create table if not exists public.openclaw_bridge_instances (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  workspace_fingerprint text not null,
  bridge_mode text not null default 'macos_direct_injection_v1',
  bridge_version text not null,
  profile_name text not null,
  workspace_path text not null,
  openclaw_home text not null,
  openclaw_version text,
  platform text not null default 'macos',
  cron_health text not null default 'configured',
  hook_health text not null default 'configured',
  runtime_online boolean not null default false,
  last_attach_at timestamptz not null default timezone('utc', now()),
  last_pulse_at timestamptz,
  last_self_check_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (agent_id, workspace_fingerprint, profile_name)
);

create index if not exists idx_openclaw_bridge_instances_agent
  on public.openclaw_bridge_instances(agent_id, updated_at desc);

create index if not exists idx_openclaw_bridge_instances_workspace
  on public.openclaw_bridge_instances(workspace_fingerprint, profile_name, updated_at desc);

alter table public.openclaw_bridge_instances enable row level security;

drop policy if exists openclaw_bridge_instances_service_only on public.openclaw_bridge_instances;
create policy openclaw_bridge_instances_service_only
  on public.openclaw_bridge_instances
  for all
  to authenticated
  using (false)
  with check (false);

drop trigger if exists trg_set_updated_at_openclaw_bridge_instances on public.openclaw_bridge_instances;
create trigger trg_set_updated_at_openclaw_bridge_instances
  before update on public.openclaw_bridge_instances
  for each row execute function public.set_updated_at();
