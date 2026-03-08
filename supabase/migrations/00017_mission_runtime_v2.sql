create type mission_visibility as enum ('private', 'scoped', 'public');
create type mountain_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
create type campaign_status as enum ('planned', 'active', 'paused', 'completed', 'cancelled');
create type work_spec_status as enum ('queued', 'ready', 'blocked', 'in_progress', 'submitted', 'verified', 'failed', 'cancelled');
create type lease_status as enum (
  'offered',
  'accepted',
  'active',
  'checkpoint_due',
  'submitted',
  'verified',
  'failed',
  'expired',
  'reassigned'
);
create type deliverable_type as enum (
  'claim',
  'note',
  'artifact',
  'proof',
  'notebook',
  'report',
  'experiment',
  'synthesis'
);
create type verification_outcome as enum (
  'pending',
  'passed',
  'failed',
  'needs_replication',
  'contradiction'
);
create type replan_reason as enum (
  'blocked',
  'duplicate',
  'low_confidence',
  'contradiction',
  'promising_signal',
  'budget_shift',
  'manual_intervention'
);
create type reward_role as enum (
  'proposer',
  'executor',
  'reviewer',
  'synthesizer',
  'verifier',
  'coalition',
  'supervisor_bonus'
);
create type settlement_policy_mode as enum (
  'fixed',
  'dynamic_difficulty',
  'auction',
  'coalition_formula',
  'replication_bonus',
  'contradiction_resolution'
);

create table mountains (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  thesis text not null,
  target_problem text not null,
  success_criteria text not null,
  domain text not null,
  horizon text not null,
  visibility mission_visibility not null default 'scoped',
  status mountain_status not null default 'draft',
  created_by_account_id uuid not null references accounts(id) on delete restrict,
  total_budget_credits numeric(18,2) not null default 0,
  budget_envelopes jsonb not null default jsonb_build_object(
    'decomposition', 0,
    'execution', 0,
    'replication', 0,
    'synthesis', 0,
    'emergency', 0
  ),
  governance_policy jsonb not null default '{}'::jsonb,
  decomposition_policy jsonb not null default '{}'::jsonb,
  settlement_policy_mode settlement_policy_mode not null default 'dynamic_difficulty',
  settlement_policy jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  launched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  title text not null,
  summary text not null,
  hypothesis text,
  status campaign_status not null default 'planned',
  risk_ceiling text not null default 'medium',
  decomposition_aggressiveness integer not null default 50 check (
    decomposition_aggressiveness between 0 and 100
  ),
  replication_policy jsonb not null default '{}'::jsonb,
  governance_policy jsonb not null default '{}'::jsonb,
  budget_credits numeric(18,2) not null default 0,
  milestone_order integer not null default 0,
  owner_account_id uuid references accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table work_specs (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  parent_work_spec_id uuid references work_specs(id) on delete set null,
  title text not null,
  summary text not null,
  status work_spec_status not null default 'queued',
  contribution_type text not null,
  role_type text not null,
  allowed_role_types text[] not null default '{}'::text[],
  input_contract jsonb not null default '{}'::jsonb,
  output_contract jsonb not null default '{}'::jsonb,
  verification_contract jsonb not null default '{}'::jsonb,
  dependency_edges jsonb not null default '[]'::jsonb,
  reward_envelope jsonb not null default '{}'::jsonb,
  checkpoint_cadence_minutes integer not null default 60 check (
    checkpoint_cadence_minutes between 5 and 10080
  ),
  duplication_policy jsonb not null default '{}'::jsonb,
  risk_class text not null default 'moderate',
  priority integer not null default 50 check (priority between 0 and 100),
  speculative boolean not null default false,
  synthesis_required boolean not null default false,
  owner_account_id uuid references accounts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table work_spec_dependencies (
  id uuid primary key default gen_random_uuid(),
  work_spec_id uuid not null references work_specs(id) on delete cascade,
  depends_on_work_spec_id uuid not null references work_specs(id) on delete cascade,
  dependency_kind text not null default 'blocks',
  created_at timestamptz not null default timezone('utc', now()),
  unique (work_spec_id, depends_on_work_spec_id)
);

create table work_leases (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  work_spec_id uuid not null references work_specs(id) on delete cascade,
  assigned_agent_id uuid references agents(id) on delete set null,
  assigned_by_account_id uuid references accounts(id) on delete set null,
  status lease_status not null default 'offered',
  offered_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  checkpoint_due_at timestamptz,
  submitted_at timestamptz,
  verified_at timestamptz,
  renewal_count integer not null default 0,
  failure_reason text,
  rationale text,
  lease_token_hash text,
  checkpoint_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table swarm_sessions (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  work_spec_id uuid references work_specs(id) on delete set null,
  title text not null,
  objective text not null,
  status text not null default 'forming',
  coalition_terms jsonb not null default '{}'::jsonb,
  credit_split_policy jsonb not null default '{}'::jsonb,
  coordination_context jsonb not null default '{}'::jsonb,
  created_by_agent_id uuid references agents(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table swarm_session_members (
  id uuid primary key default gen_random_uuid(),
  swarm_session_id uuid not null references swarm_sessions(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  role text not null,
  invite_status text not null default 'invited',
  joined_at timestamptz,
  contribution_weight numeric(6,3) not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (swarm_session_id, agent_id)
);

create table deliverables (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  work_spec_id uuid references work_specs(id) on delete set null,
  work_lease_id uuid references work_leases(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  deliverable_type deliverable_type not null default 'artifact',
  title text not null,
  summary text not null,
  evidence_bundle jsonb not null default '[]'::jsonb,
  claims jsonb not null default '[]'::jsonb,
  references_bundle jsonb not null default '[]'::jsonb,
  upstream_refs text[] not null default '{}'::text[],
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  novelty_score numeric(5,2) not null default 0 check (novelty_score between 0 and 100),
  reproducibility_score numeric(5,2) not null default 0 check (reproducibility_score between 0 and 100),
  artifact_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table verification_runs (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  work_spec_id uuid references work_specs(id) on delete set null,
  deliverable_id uuid references deliverables(id) on delete cascade,
  verifier_agent_id uuid references agents(id) on delete set null,
  requested_by_agent_id uuid references agents(id) on delete set null,
  verification_type text not null,
  outcome verification_outcome not null default 'pending',
  confidence_delta numeric(6,2) not null default 0,
  contradiction_count integer not null default 0,
  findings jsonb not null default '[]'::jsonb,
  evidence_bundle jsonb not null default '[]'::jsonb,
  requested_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table replans (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  work_spec_id uuid references work_specs(id) on delete set null,
  work_lease_id uuid references work_leases(id) on delete set null,
  issued_by_account_id uuid references accounts(id) on delete set null,
  reason replan_reason not null,
  action text not null,
  summary text not null,
  status text not null default 'open',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table reward_splits (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references mountains(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  work_spec_id uuid references work_specs(id) on delete set null,
  work_lease_id uuid references work_leases(id) on delete set null,
  deliverable_id uuid references deliverables(id) on delete set null,
  beneficiary_agent_id uuid references agents(id) on delete set null,
  beneficiary_account_id uuid references accounts(id) on delete set null,
  role reward_role not null,
  amount_credits numeric(18,2) not null default 0,
  rationale text not null,
  settlement_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table agent_capability_profiles (
  agent_id uuid primary key references agents(id) on delete cascade,
  domain_tags text[] not null default '{}'::text[],
  tool_access_classes text[] not null default '{}'::text[],
  compute_profile jsonb not null default '{}'::jsonb,
  preferred_roles text[] not null default '{}'::text[],
  collaboration_style text,
  replication_reliability numeric(5,2) not null default 0 check (
    replication_reliability between 0 and 100
  ),
  synthesis_quality numeric(5,2) not null default 0 check (
    synthesis_quality between 0 and 100
  ),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table agent_reputation_scores (
  agent_id uuid primary key references agents(id) on delete cascade,
  mission_reliability numeric(5,2) not null default 0 check (mission_reliability between 0 and 100),
  scientific_rigor numeric(5,2) not null default 0 check (scientific_rigor between 0 and 100),
  collaboration_quality numeric(5,2) not null default 0 check (collaboration_quality between 0 and 100),
  review_quality numeric(5,2) not null default 0 check (review_quality between 0 and 100),
  social_contribution numeric(5,2) not null default 0 check (social_contribution between 0 and 100),
  deployment_health numeric(5,2) not null default 0 check (deployment_health between 0 and 100),
  updated_at timestamptz not null default timezone('utc', now())
);

create index mountains_status_idx on mountains(status);
create index mountains_visibility_idx on mountains(visibility);
create index campaigns_mountain_status_idx on campaigns(mountain_id, status);
create index work_specs_mountain_status_idx on work_specs(mountain_id, status);
create index work_specs_campaign_idx on work_specs(campaign_id);
create index work_leases_assignment_idx on work_leases(assigned_agent_id, status);
create index work_leases_spec_idx on work_leases(work_spec_id, status);
create index swarm_sessions_mountain_idx on swarm_sessions(mountain_id, status);
create index swarm_members_agent_idx on swarm_session_members(agent_id, invite_status);
create index deliverables_spec_idx on deliverables(work_spec_id, created_at desc);
create index verification_runs_outcome_idx on verification_runs(outcome, requested_at desc);
create index replans_mountain_status_idx on replans(mountain_id, status);
create index reward_splits_beneficiary_idx on reward_splits(beneficiary_agent_id, settlement_status);

