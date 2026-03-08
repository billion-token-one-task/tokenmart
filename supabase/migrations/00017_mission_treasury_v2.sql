-- ============================================================================
-- Migration: 00017_mission_treasury_v2.sql
-- Description:
--   Introduce the admin-funded mission treasury model, proposal market,
--   supervised runs, tranche controls, and mission-scoped credit accounting.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  charter TEXT NOT NULL,
  scientific_objective TEXT NOT NULL,
  success_metric TEXT NOT NULL,
  public_rationale TEXT,
  created_by_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supervisor_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  output_visibility TEXT NOT NULL DEFAULT 'open',
  allowed_tool_classes JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  termination_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_missions_status CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  CONSTRAINT chk_missions_visibility CHECK (output_visibility IN ('open', 'mixed', 'private'))
);

CREATE INDEX IF NOT EXISTS idx_missions_status_updated_at
  ON public.missions (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.mission_treasuries (
  mission_id UUID PRIMARY KEY REFERENCES public.missions(id) ON DELETE CASCADE,
  total_budget DECIMAL(20,8) NOT NULL DEFAULT 0,
  reserved_credits DECIMAL(20,8) NOT NULL DEFAULT 0,
  spent_credits DECIMAL(20,8) NOT NULL DEFAULT 0,
  clawed_back_credits DECIMAL(20,8) NOT NULL DEFAULT 0,
  bonus_credits DECIMAL(20,8) NOT NULL DEFAULT 0,
  emergency_freeze BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mission_lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  lane_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  budget_ceiling DECIMAL(20,8) NOT NULL DEFAULT 0,
  per_agent_ceiling DECIMAL(20,8) NOT NULL DEFAULT 0,
  burst_ceiling DECIMAL(20,8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mission_lane_key UNIQUE (mission_id, lane_key),
  CONSTRAINT chk_mission_lanes_status CHECK (status IN ('draft', 'open', 'paused', 'frozen', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_mission_lanes_mission_id
  ON public.mission_lanes (mission_id, sort_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS public.mission_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  lane_id UUID NOT NULL REFERENCES public.mission_lanes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  desired_outcome TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority INTEGER NOT NULL DEFAULT 50,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mission_problems_status CHECK (status IN ('open', 'proposal_review', 'funded', 'active', 'verified', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_mission_problems_lane_id
  ON public.mission_problems (lane_id, priority DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS public.mission_work_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  lane_id UUID NOT NULL REFERENCES public.mission_lanes(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.mission_problems(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  tranche_kind TEXT NOT NULL DEFAULT 'planning',
  posted_reward DECIMAL(20,8) NOT NULL DEFAULT 0,
  budget_cap DECIMAL(20,8) NOT NULL DEFAULT 0,
  deliverable_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mission_work_packages_status CHECK (status IN ('open', 'proposal_review', 'funded', 'active', 'verified', 'reconciled', 'archived')),
  CONSTRAINT chk_mission_work_packages_tranche_kind CHECK (tranche_kind IN ('planning', 'exploration', 'execution', 'verification', 'impact_bonus'))
);

CREATE INDEX IF NOT EXISTS idx_mission_work_packages_problem_id
  ON public.mission_work_packages (problem_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mission_coalitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  summary TEXT,
  lead_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mission_coalition_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coalition_id UUID NOT NULL REFERENCES public.mission_coalitions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mission_coalition_members UNIQUE (coalition_id, agent_id)
);

CREATE TABLE IF NOT EXISTS public.mission_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  lane_id UUID NOT NULL REFERENCES public.mission_lanes(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.mission_problems(id) ON DELETE CASCADE,
  work_package_id UUID NOT NULL REFERENCES public.mission_work_packages(id) ON DELETE CASCADE,
  proposer_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  coalition_id UUID REFERENCES public.mission_coalitions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  plan_summary TEXT NOT NULL,
  requested_tranche_kind TEXT NOT NULL DEFAULT 'planning',
  requested_credits DECIMAL(20,8) NOT NULL DEFAULT 0,
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
  timeline_summary TEXT,
  dependency_summary TEXT,
  evidence_of_fit TEXT,
  review_needs TEXT,
  expected_artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  score DECIMAL(6,4),
  score_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mission_proposals_status CHECK (status IN ('submitted', 'approved', 'rejected', 'withdrawn')),
  CONSTRAINT chk_mission_proposals_tranche_kind CHECK (requested_tranche_kind IN ('planning', 'exploration', 'execution', 'verification', 'impact_bonus'))
);

CREATE INDEX IF NOT EXISTS idx_mission_proposals_work_package_id
  ON public.mission_proposals (work_package_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_proposals_status_score
  ON public.mission_proposals (status, score DESC NULLS LAST, created_at DESC);

CREATE TABLE IF NOT EXISTS public.supervisor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  lane_id UUID NOT NULL REFERENCES public.mission_lanes(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.mission_problems(id) ON DELETE CASCADE,
  work_package_id UUID NOT NULL REFERENCES public.mission_work_packages(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.mission_proposals(id) ON DELETE SET NULL,
  supervisor_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supervisor_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'funded',
  budget_cap DECIMAL(20,8) NOT NULL DEFAULT 0,
  tranche_released DECIMAL(20,8) NOT NULL DEFAULT 0,
  acceptance_contract JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supervisor_runs_status CHECK (status IN ('waiting_for_bid', 'proposal_review', 'funded', 'active', 'waiting_for_dependency', 'waiting_for_clarification', 'waiting_for_review', 'rework_requested', 'verified', 'reconciled', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_supervisor_runs_mission_id
  ON public.supervisor_runs (mission_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_supervisor_runs_supervisor_account_id
  ON public.supervisor_runs (supervisor_account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES public.run_steps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  budget_cap DECIMAL(20,8) NOT NULL DEFAULT 0,
  spent_credits DECIMAL(20,8) NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_run_steps_status CHECK (status IN ('active', 'waiting_for_dependency', 'waiting_for_clarification', 'waiting_for_review', 'rework_requested', 'verified', 'reconciled', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_run_steps_run_id
  ON public.run_steps (run_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_run_steps_assigned_agent_id
  ON public.run_steps (assigned_agent_id, status, updated_at DESC)
  WHERE assigned_agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.delegation_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_step_id UUID NOT NULL UNIQUE REFERENCES public.run_steps(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  allowed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation_method TEXT,
  review_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_target JSONB NOT NULL DEFAULT '{}'::jsonb,
  deadline_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.run_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  run_step_id UUID REFERENCES public.run_steps(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL DEFAULT 'planner',
  reviewer_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  reviewer_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  summary TEXT,
  evidence_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT chk_run_reviews_review_type CHECK (review_type IN ('planner', 'execution', 'reconciler')),
  CONSTRAINT chk_run_reviews_decision CHECK (decision IN ('pending', 'approve', 'reject', 'needs_changes'))
);

CREATE INDEX IF NOT EXISTS idx_run_reviews_run_id
  ON public.run_reviews (run_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.run_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  run_step_id UUID REFERENCES public.run_steps(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  title TEXT NOT NULL,
  uri TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'open',
  created_by_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_run_artifacts_visibility CHECK (visibility IN ('open', 'mixed', 'private'))
);

CREATE INDEX IF NOT EXISTS idx_run_artifacts_run_id
  ON public.run_artifacts (run_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  run_step_id UUID REFERENCES public.run_steps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_id
  ON public.run_events (run_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mission_tranches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  lane_id UUID REFERENCES public.mission_lanes(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  tranche_kind TEXT NOT NULL DEFAULT 'planning',
  status TEXT NOT NULL DEFAULT 'planned',
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  reserved_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  released_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  granted_to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  notes TEXT,
  created_by_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mission_tranches_kind CHECK (tranche_kind IN ('planning', 'exploration', 'execution', 'verification', 'impact_bonus')),
  CONSTRAINT chk_mission_tranches_status CHECK (status IN ('planned', 'reserved', 'released', 'spent', 'clawed_back'))
);

CREATE INDEX IF NOT EXISTS idx_mission_tranches_mission_id
  ON public.mission_tranches (mission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  lane_id UUID REFERENCES public.mission_lanes(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  run_step_id UUID REFERENCES public.run_steps(id) ON DELETE CASCADE,
  tranche_id UUID REFERENCES public.mission_tranches(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved',
  reason TEXT NOT NULL,
  created_by_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  CONSTRAINT chk_credit_reservations_status CHECK (status IN ('reserved', 'released', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_mission_id
  ON public.credit_reservations (mission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_burn_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.credit_reservations(id) ON DELETE SET NULL,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  run_step_id UUID REFERENCES public.run_steps(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  burn_type TEXT NOT NULL DEFAULT 'execution',
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_burn_events_mission_id
  ON public.credit_burn_events (mission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_clawbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.credit_reservations(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  created_by_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bonus_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.supervisor_runs(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.mission_proposals(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  created_by_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.review_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  run_review_id UUID NOT NULL REFERENCES public.run_reviews(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
