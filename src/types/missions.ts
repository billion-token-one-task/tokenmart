export type MissionStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type MissionVisibility = "open" | "mixed" | "private";

export type MissionLaneStatus =
  | "draft"
  | "open"
  | "paused"
  | "frozen"
  | "completed";

export type MissionProblemStatus =
  | "open"
  | "proposal_review"
  | "funded"
  | "active"
  | "verified"
  | "archived";

export type WorkPackageStatus =
  | "open"
  | "proposal_review"
  | "funded"
  | "active"
  | "verified"
  | "reconciled"
  | "archived";

export type ProposalStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "withdrawn";

export type TrancheKind =
  | "planning"
  | "exploration"
  | "execution"
  | "verification"
  | "impact_bonus";

export type TrancheStatus =
  | "planned"
  | "reserved"
  | "released"
  | "spent"
  | "clawed_back";

export type RunStatus =
  | "waiting_for_bid"
  | "proposal_review"
  | "funded"
  | "active"
  | "waiting_for_dependency"
  | "waiting_for_clarification"
  | "waiting_for_review"
  | "rework_requested"
  | "verified"
  | "reconciled"
  | "archived";

export type RunStepStatus =
  | "active"
  | "waiting_for_dependency"
  | "waiting_for_clarification"
  | "waiting_for_review"
  | "rework_requested"
  | "verified"
  | "reconciled"
  | "archived";

export type RunReviewType = "planner" | "execution" | "reconciler";
export type RunReviewDecision = "pending" | "approve" | "reject" | "needs_changes";

export interface Mission {
  id: string;
  slug: string;
  title: string;
  charter: string;
  scientific_objective: string;
  success_metric: string;
  public_rationale: string | null;
  created_by_account_id: string;
  supervisor_agent_id: string | null;
  status: MissionStatus;
  output_visibility: MissionVisibility;
  allowed_tool_classes: string[];
  review_policy: Record<string, unknown>;
  termination_conditions: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionTreasury {
  mission_id: string;
  total_budget: number;
  reserved_credits: number;
  spent_credits: number;
  clawed_back_credits: number;
  bonus_credits: number;
  emergency_freeze: boolean;
  created_at: string;
  updated_at: string;
}

export interface MissionLane {
  id: string;
  mission_id: string;
  lane_key: string;
  title: string;
  summary: string | null;
  budget_ceiling: number;
  per_agent_ceiling: number;
  burst_ceiling: number;
  status: MissionLaneStatus;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProblemStatement {
  id: string;
  mission_id: string;
  lane_id: string;
  title: string;
  statement: string;
  desired_outcome: string | null;
  status: MissionProblemStatus;
  priority: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkPackage {
  id: string;
  mission_id: string;
  lane_id: string;
  problem_id: string;
  title: string;
  brief: string;
  status: WorkPackageStatus;
  tranche_kind: TrancheKind;
  posted_reward: number;
  budget_cap: number;
  deliverable_spec: Record<string, unknown>;
  evaluation_spec: Record<string, unknown>;
  dependencies: string[];
  review_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Coalition {
  id: string;
  mission_id: string;
  name: string;
  summary: string | null;
  lead_agent_id: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  mission_id: string;
  lane_id: string;
  problem_id: string;
  work_package_id: string;
  proposer_agent_id: string;
  coalition_id: string | null;
  status: ProposalStatus;
  plan_summary: string;
  requested_tranche_kind: TrancheKind;
  requested_credits: number;
  confidence: number;
  timeline_summary: string | null;
  dependency_summary: string | null;
  evidence_of_fit: string | null;
  review_needs: string | null;
  expected_artifacts: string[];
  score: number | null;
  score_reasons: string[];
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupervisorRun {
  id: string;
  mission_id: string;
  lane_id: string;
  problem_id: string;
  work_package_id: string;
  proposal_id: string | null;
  supervisor_account_id: string;
  supervisor_agent_id: string | null;
  status: RunStatus;
  budget_cap: number;
  tranche_released: number;
  acceptance_contract: Record<string, unknown>;
  escalation_policy: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DelegationContract {
  id: string;
  run_step_id: string;
  objective: string;
  allowed_tools: string[];
  forbidden_actions: string[];
  required_outputs: string[];
  evaluation_method: string | null;
  review_path: string[];
  escalation_target: Record<string, unknown>;
  deadline_at: string | null;
  metadata: Record<string, unknown>;
}

export interface RunStep {
  id: string;
  run_id: string;
  parent_step_id: string | null;
  title: string;
  objective: string;
  status: RunStepStatus;
  assigned_agent_id: string | null;
  budget_cap: number;
  spent_credits: number;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  delegation_contract: DelegationContract | null;
}

export interface RunReview {
  id: string;
  run_id: string;
  run_step_id: string | null;
  review_type: RunReviewType;
  reviewer_account_id: string | null;
  reviewer_agent_id: string | null;
  decision: RunReviewDecision;
  summary: string | null;
  evidence_findings: unknown[];
  created_at: string;
  submitted_at: string | null;
}

export interface RunArtifact {
  id: string;
  run_id: string;
  run_step_id: string | null;
  artifact_type: string;
  title: string;
  uri: string | null;
  content: Record<string, unknown>;
  visibility: MissionVisibility;
  created_at: string;
}

export interface MissionInboxItem {
  id: string;
  kind:
    | "proposal_opportunity"
    | "assigned_run"
    | "assigned_step"
    | "review_request"
    | "clarification_needed"
    | "reproduction_call";
  title: string;
  description: string;
  href: string | null;
  status: string;
  priority: number;
  reasons: string[];
  metadata: Record<string, unknown>;
}

export interface MissionTrustSnapshot {
  mission_trust_score: number;
  market_trust_score: number;
  orchestration_score: number;
  service_health_score: number;
  eligible: boolean;
  reasons: string[];
}
