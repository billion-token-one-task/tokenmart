create table if not exists public.agent_runtime_instances (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  runtime_kind text not null,
  runtime_version text null,
  runtime_instance_id text not null,
  workspace_or_instance_fingerprint text not null,
  claim_state text not null default 'registered_unclaimed',
  presence_state text not null default 'attached',
  scoped_runtime_key_prefix text null,
  capability_card jsonb not null default '{}'::jsonb,
  participation_profile text not null default 'ambient_observer',
  duty_mode text not null default 'ambient_watch',
  subscriptions jsonb not null default '[]'::jsonb,
  runtime_fetch_health text not null default 'unknown',
  outbox_health text not null default 'healthy',
  update_status text not null default 'current',
  degraded_reason text null,
  last_attach_at timestamptz not null default timezone('utc'::text, now()),
  last_delta_at timestamptz null,
  last_self_check_at timestamptz null,
  last_runtime_fetch_at timestamptz null,
  last_challenge_at timestamptz null,
  last_outbox_ack_at timestamptz null,
  last_cursor text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint agent_runtime_instances_runtime_kind_check check (runtime_kind in ('openclaw', 'mcp', 'a2a', 'sdk_ts', 'sdk_python', 'sidecar', 'langgraph', 'crewai', 'agent_framework', 'bedrock_agentcore', 'openai_background', 'custom')),
  constraint agent_runtime_instances_claim_state_check check (claim_state in ('registered_unclaimed', 'connected_unclaimed', 'claimed')),
  constraint agent_runtime_instances_presence_state_check check (presence_state in ('attached', 'online', 'degraded', 'offline', 'rekey_required')),
  constraint agent_runtime_instances_participation_profile_check check (participation_profile in ('ambient_observer', 'intermittent_contributor', 'always_on_worker', 'coalition_specialist', 'verifier_node', 'replication_node')),
  constraint agent_runtime_instances_duty_mode_check check (duty_mode in ('ambient_watch', 'enlisted_mission', 'coalition_duty', 'verification_duty', 'replication_duty')),
  constraint agent_runtime_instances_runtime_fetch_health_check check (runtime_fetch_health in ('unknown', 'healthy', 'degraded')),
  constraint agent_runtime_instances_outbox_health_check check (outbox_health in ('healthy', 'degraded', 'replaying')),
  constraint agent_runtime_instances_update_status_check check (update_status in ('current', 'update_available', 'update_required', 'updating', 'update_failed'))
);

create unique index if not exists idx_agent_runtime_instances_unique_instance
  on public.agent_runtime_instances (runtime_kind, runtime_instance_id);

create unique index if not exists idx_agent_runtime_instances_unique_fingerprint
  on public.agent_runtime_instances (agent_id, runtime_kind, workspace_or_instance_fingerprint);

create index if not exists idx_agent_runtime_instances_agent_updated
  on public.agent_runtime_instances (agent_id, updated_at desc);

create index if not exists idx_agent_runtime_instances_participation
  on public.agent_runtime_instances (runtime_kind, participation_profile, duty_mode, updated_at desc);

alter table public.agent_runtime_instances enable row level security;

drop policy if exists agent_runtime_instances_service_only on public.agent_runtime_instances;
create policy agent_runtime_instances_service_only
  on public.agent_runtime_instances
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists trg_set_updated_at_agent_runtime_instances on public.agent_runtime_instances;
create trigger trg_set_updated_at_agent_runtime_instances
  before update on public.agent_runtime_instances
  for each row
  execute function public.set_updated_at();

create table if not exists public.agent_runtime_outbox_ops (
  id uuid primary key default gen_random_uuid(),
  runtime_instance_id uuid not null references public.agent_runtime_instances(id) on delete cascade,
  operation_id text not null,
  action_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  acked boolean not null default false,
  acknowledged_at timestamptz null,
  retry_count integer not null default 0,
  last_error text null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint agent_runtime_outbox_ops_unique unique (runtime_instance_id, operation_id)
);

create index if not exists idx_agent_runtime_outbox_ops_runtime_ack
  on public.agent_runtime_outbox_ops (runtime_instance_id, acked, updated_at desc);

alter table public.agent_runtime_outbox_ops enable row level security;

drop policy if exists agent_runtime_outbox_ops_service_only on public.agent_runtime_outbox_ops;
create policy agent_runtime_outbox_ops_service_only
  on public.agent_runtime_outbox_ops
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists trg_set_updated_at_agent_runtime_outbox_ops on public.agent_runtime_outbox_ops;
create trigger trg_set_updated_at_agent_runtime_outbox_ops
  before update on public.agent_runtime_outbox_ops
  for each row
  execute function public.set_updated_at();
