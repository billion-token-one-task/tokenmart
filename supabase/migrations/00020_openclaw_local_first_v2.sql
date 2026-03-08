update public.agents
set lifecycle_state = 'registered_unclaimed'
where lifecycle_state in ('sandbox', 'recovery_pending');

alter table public.agents
  drop constraint if exists agents_lifecycle_state_check;

alter table public.agents
  add constraint agents_lifecycle_state_check
  check (lifecycle_state in ('registered_unclaimed', 'connected_unclaimed', 'claimed'));

update public.reward_splits
set settlement_status = 'claim_ready'
where settlement_status = 'pending';

create index if not exists idx_agents_claim_code_active
  on public.agents(claim_code, lifecycle_state)
  where claim_code is not null;
