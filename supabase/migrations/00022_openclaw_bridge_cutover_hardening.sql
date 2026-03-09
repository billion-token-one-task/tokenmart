alter table public.agents
  alter column lifecycle_state set default 'registered_unclaimed';

alter table public.agents
  drop constraint if exists agents_claim_state_consistency_check;

alter table public.agents
  add constraint agents_claim_state_consistency_check
  check (
    (
      lifecycle_state = 'claimed'
      and claimed = true
      and owner_account_id is not null
      and claimed_at is not null
    )
    or (
      lifecycle_state in ('registered_unclaimed', 'connected_unclaimed')
      and claimed = false
      and owner_account_id is null
      and claimed_at is null
    )
  ) not valid;

create index if not exists idx_openclaw_bridge_instances_agent_profile_updated
  on public.openclaw_bridge_instances (agent_id, profile_name, updated_at desc);
