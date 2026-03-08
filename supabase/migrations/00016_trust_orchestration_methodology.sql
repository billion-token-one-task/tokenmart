-- ============================================================================
-- Migration: 00016_trust_orchestration_methodology.sql
-- Description:
--   Introduce canonical service-health and orchestration capability fields,
--   plus richer task/goal/work-graph contracts for explicit decomposition.
-- ============================================================================

ALTER TABLE public.daemon_scores
  ADD COLUMN IF NOT EXISTS score_version TEXT NOT NULL DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS runtime_mode TEXT NOT NULL DEFAULT 'undeclared',
  ADD COLUMN IF NOT EXISTS declared_interval_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS heartbeat_sample_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenge_sample_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cadence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenge_reliability_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latency_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chain_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decomposition_quality_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_health_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orchestration_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.daemon_scores.score_version IS 'Version label for the score methodology.';
COMMENT ON COLUMN public.daemon_scores.runtime_mode IS 'Declared or inferred heartbeat runtime mode.';
COMMENT ON COLUMN public.daemon_scores.declared_interval_seconds IS 'Expected heartbeat interval declared by the agent runtime.';
COMMENT ON COLUMN public.daemon_scores.heartbeat_sample_count IS 'Heartbeat samples used for the latest score.';
COMMENT ON COLUMN public.daemon_scores.challenge_sample_count IS 'Micro-challenge samples used for the latest score.';
COMMENT ON COLUMN public.daemon_scores.cadence_score IS 'Cadence adherence points within the service-health model.';
COMMENT ON COLUMN public.daemon_scores.challenge_reliability_score IS 'Challenge reliability points within the service-health model.';
COMMENT ON COLUMN public.daemon_scores.latency_score IS 'Challenge latency points within the service-health model.';
COMMENT ON COLUMN public.daemon_scores.chain_score IS 'Nonce-chain continuity points within the service-health model.';
COMMENT ON COLUMN public.daemon_scores.decomposition_quality_score IS 'Planning/decomposition quality points within the orchestration model.';
COMMENT ON COLUMN public.daemon_scores.service_health_score IS 'Canonical service-health score (0-100).';
COMMENT ON COLUMN public.daemon_scores.orchestration_score IS 'Canonical orchestration-capability score (0-100).';
COMMENT ON COLUMN public.daemon_scores.score_confidence IS 'Confidence multiplier derived from sample size and evidence coverage.';
COMMENT ON COLUMN public.daemon_scores.metrics IS 'Raw score inputs and detailed sub-score metadata.';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS methodology_version TEXT NOT NULL DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS input_spec JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS output_spec JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retry_policy JSONB NOT NULL DEFAULT '{"max_attempts":1}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_method TEXT,
  ADD COLUMN IF NOT EXISTS verification_target TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS actual_minutes INTEGER;

COMMENT ON COLUMN public.tasks.priority IS 'Relative planning priority from 0-100.';
COMMENT ON COLUMN public.tasks.methodology_version IS 'Methodology version used to decompose the task.';
COMMENT ON COLUMN public.tasks.metadata IS 'Additional structured task metadata such as budgets, skills, or execution policy.';
COMMENT ON COLUMN public.tasks.input_spec IS 'Structured input requirements for the overall task.';
COMMENT ON COLUMN public.tasks.output_spec IS 'Structured output contract for the overall task.';
COMMENT ON COLUMN public.tasks.retry_policy IS 'Retry and escalation policy for the overall task.';
COMMENT ON COLUMN public.tasks.verification_method IS 'How the task outcome should be verified.';
COMMENT ON COLUMN public.tasks.verification_target IS 'Verification command or target reference for the task.';
COMMENT ON COLUMN public.tasks.estimated_minutes IS 'Estimated time budget for the task.';
COMMENT ON COLUMN public.tasks.actual_minutes IS 'Observed or reconciled execution time for the task.';

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES public.agents(id),
  ADD COLUMN IF NOT EXISTS credit_reward DECIMAL(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS input_spec JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS output_spec JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retry_policy JSONB NOT NULL DEFAULT '{"max_attempts":1}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_method TEXT,
  ADD COLUMN IF NOT EXISTS verification_target TEXT,
  ADD COLUMN IF NOT EXISTS orchestration_role TEXT NOT NULL DEFAULT 'execute',
  ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'deliverable',
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS actual_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS completion_confidence DECIMAL(5,4);

COMMENT ON COLUMN public.goals.assigned_agent_id IS 'Agent currently responsible for the goal.';
COMMENT ON COLUMN public.goals.credit_reward IS 'Credits allocated to this goal if completed.';
COMMENT ON COLUMN public.goals.metadata IS 'Structured goal metadata such as tags, budgets, or skill requirements.';
COMMENT ON COLUMN public.goals.evidence IS 'Structured evidence records for the goal.';
COMMENT ON COLUMN public.goals.input_spec IS 'Structured input requirements for the goal.';
COMMENT ON COLUMN public.goals.output_spec IS 'Structured output contract for the goal.';
COMMENT ON COLUMN public.goals.retry_policy IS 'Retry and escalation policy for the goal.';
COMMENT ON COLUMN public.goals.verification_method IS 'How the goal should be verified (manual, command, checklist, etc.).';
COMMENT ON COLUMN public.goals.verification_target IS 'Verification command or target reference.';
COMMENT ON COLUMN public.goals.orchestration_role IS 'Role expected for this goal: plan, execute, review, coordinate.';
COMMENT ON COLUMN public.goals.node_type IS 'Node type within the work graph.';
COMMENT ON COLUMN public.goals.blocked_reason IS 'Current blocker summary when the goal cannot proceed.';
COMMENT ON COLUMN public.goals.estimated_minutes IS 'Estimated time budget for the goal.';
COMMENT ON COLUMN public.goals.actual_minutes IS 'Observed or reconciled execution time for the goal.';
COMMENT ON COLUMN public.goals.completion_confidence IS 'Confidence score attached to the current goal state.';

CREATE INDEX IF NOT EXISTS idx_tasks_priority
  ON public.tasks (priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goals_assigned_agent_id
  ON public.goals (assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.goal_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  depends_on_goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  dependency_kind TEXT NOT NULL DEFAULT 'blocking',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_goal_dependencies UNIQUE (goal_id, depends_on_goal_id),
  CONSTRAINT chk_goal_dependencies_no_self CHECK (goal_id <> depends_on_goal_id)
);

COMMENT ON TABLE public.goal_dependencies IS 'Explicit dependency edges between goals.';
COMMENT ON COLUMN public.goal_dependencies.dependency_kind IS 'Edge semantics: blocking, soft, review, or informational.';

CREATE INDEX IF NOT EXISTS idx_goal_dependencies_goal_id
  ON public.goal_dependencies (goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_dependencies_depends_on_goal_id
  ON public.goal_dependencies (depends_on_goal_id);

CREATE TABLE IF NOT EXISTS public.execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.accounts(id),
  agent_id UUID REFERENCES public.agents(id),
  status TEXT NOT NULL DEFAULT 'draft',
  methodology_version TEXT NOT NULL DEFAULT 'v2',
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.execution_plans IS 'Materialized execution plans that expose task decomposition to agents and operators.';

CREATE INDEX IF NOT EXISTS idx_execution_plans_task_id
  ON public.execution_plans (task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_plans_agent_id
  ON public.execution_plans (agent_id, updated_at DESC)
  WHERE agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.execution_plan_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.execution_plans(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  parent_node_id UUID REFERENCES public.execution_plan_nodes(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  node_type TEXT NOT NULL DEFAULT 'deliverable',
  orchestration_role TEXT NOT NULL DEFAULT 'execute',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_agent_id UUID REFERENCES public.agents(id),
  priority INTEGER NOT NULL DEFAULT 50,
  confidence DECIMAL(5,4),
  budget_credits DECIMAL(20,8),
  budget_minutes INTEGER,
  actual_minutes INTEGER,
  passing_spec TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_spec JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_spec JSONB NOT NULL DEFAULT '[]'::jsonb,
  retry_policy JSONB NOT NULL DEFAULT '{"max_attempts":1}'::jsonb,
  verification_method TEXT,
  verification_target TEXT,
  rework_count INTEGER NOT NULL DEFAULT 0,
  handoff_count INTEGER NOT NULL DEFAULT 0,
  successful_handoff_count INTEGER NOT NULL DEFAULT 0,
  duplicate_overlap_score DECIMAL(5,4) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_execution_plan_nodes UNIQUE (plan_id, node_key)
);

COMMENT ON TABLE public.execution_plan_nodes IS 'Concrete executable nodes for an execution plan.';

CREATE TABLE IF NOT EXISTS public.execution_plan_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.execution_plans(id) ON DELETE CASCADE,
  reviewer_agent_id UUID REFERENCES public.agents(id),
  reviewer_account_id UUID REFERENCES public.accounts(id),
  review_type TEXT NOT NULL DEFAULT 'planner',
  decision TEXT NOT NULL DEFAULT 'pending',
  summary TEXT,
  score DECIMAL(5,2),
  evidence_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT chk_execution_plan_reviews_decision CHECK (decision IN ('pending', 'approve', 'reject', 'needs_changes'))
);

COMMENT ON TABLE public.execution_plan_reviews IS 'Planner/reviewer loop records for execution plans.';
COMMENT ON COLUMN public.execution_plan_reviews.review_type IS 'planner, reviewer, or reconciler review role.';
COMMENT ON COLUMN public.execution_plan_reviews.evidence_findings IS 'Structured review findings tied to evidence and validation.';

CREATE INDEX IF NOT EXISTS idx_execution_plan_reviews_plan_id
  ON public.execution_plan_reviews (plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_plan_reviews_reviewer_agent_id
  ON public.execution_plan_reviews (reviewer_agent_id, submitted_at DESC)
  WHERE reviewer_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_execution_plan_nodes_plan_id
  ON public.execution_plan_nodes (plan_id, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_execution_plan_nodes_assigned_agent_id
  ON public.execution_plan_nodes (assigned_agent_id, status, priority DESC)
  WHERE assigned_agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.execution_plan_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.execution_plans(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES public.execution_plan_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.execution_plan_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL DEFAULT 'blocking',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_execution_plan_edges UNIQUE (from_node_id, to_node_id),
  CONSTRAINT chk_execution_plan_edges_no_self CHECK (from_node_id <> to_node_id)
);

COMMENT ON TABLE public.execution_plan_edges IS 'Dependency edges between execution-plan nodes.';

CREATE INDEX IF NOT EXISTS idx_execution_plan_edges_plan_id
  ON public.execution_plan_edges (plan_id);
