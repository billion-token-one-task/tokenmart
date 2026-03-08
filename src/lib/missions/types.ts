export type MissionStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived"
  | "completed"
  | "cancelled";

export type MissionVisibility = "open" | "mixed" | "private";

export type MissionLaneStatus =
  | "draft"
  | "open"
  | "reserved"
  | "paused"
  | "completed"
  | "archived";

export type MissionProblemStatus =
  | "open"
  | "proposal_review"
  | "funded"
  | "active"
  | "blocked"
  | "completed"
  | "archived";

export type MissionProblemWorkType =
  | "planning"
  | "exploration"
  | "execution"
  | "verification"
  | "replication"
  | "review";

export type MissionProposalStatus =
  | "submitted"
  | "shortlisted"
  | "approved"
  | "rejected"
  | "withdrawn";

export type MissionTrancheType =
  | "planning"
  | "exploration"
  | "execution"
  | "verification"
  | "impact_bonus";

export type MissionTrancheStatus = "planned" | "released" | "spent" | "cancelled";

export type SupervisorRunStatus =
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
  | "archived"
  | "cancelled"
  | "blocked";

export interface Mission {
  id: string;
  admin_account_id: string;
  title: string;
  slug: string;
  status: MissionStatus;
  visibility: MissionVisibility;
  charter: string;
  scientific_objective: string;
  success_metric: string;
  public_rationale: string | null;
  allowed_tool_classes: string[];
  review_policy: Record<string, unknown>;
  output_visibility: MissionVisibility;
  termination_conditions: string | null;
  total_credit_budget: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionLane {
  id: string;
  mission_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: MissionLaneStatus;
  priority: number;
  budget_ceiling: number | null;
  success_metric: string | null;
  output_visibility: MissionVisibility;
  allowed_tool_classes: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionProblem {
  id: string;
  mission_id: string;
  lane_id: string;
  title: string;
  slug: string;
  description: string;
  status: MissionProblemStatus;
  work_type: MissionProblemWorkType;
  budget_ceiling: number | null;
  artifact_spec: unknown[];
  evidence_requirements: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionProposal {
  id: string;
  mission_id: string;
  lane_id: string;
  problem_id: string;
  proposing_agent_id: string;
  coalition_id: string | null;
  status: MissionProposalStatus;
  plan_summary: string;
  full_plan: string | null;
  requested_credits: number;
  requested_tranche_type: MissionTrancheType;
  confidence: number;
  dependencies: unknown[];
  evidence: unknown[];
  expected_artifacts: unknown[];
  review_needs: unknown[];
  timeline_summary: string | null;
  ranking_score: number;
  review_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionTreasury {
  mission_id: string;
  total_credits: number;
  reserved_credits: number;
  burned_credits: number;
  clawed_back_credits: number;
  bonus_pool_credits: number;
  per_lane_ceiling: number | null;
  per_agent_ceiling: number | null;
  burst_allowance: number | null;
  emergency_frozen: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionTranche {
  id: string;
  mission_id: string;
  lane_id: string | null;
  run_id: string | null;
  released_by_account_id: string | null;
  tranche_type: MissionTrancheType;
  status: MissionTrancheStatus;
  credits: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SupervisorRun {
  id: string;
  mission_id: string;
  lane_id: string | null;
  problem_id: string | null;
  proposal_id: string | null;
  supervisor_account_id: string | null;
  supervisor_agent_id: string | null;
  title: string;
  objective: string;
  status: SupervisorRunStatus;
  acceptance_contract: string | null;
  allowed_tools: string[];
  forbidden_actions: string[];
  budget_cap: number;
  budget_allocated: number;
  escalation_policy: Record<string, unknown>;
  review_policy: Record<string, unknown>;
  due_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RunStep {
  id: string;
  run_id: string;
  parent_step_id: string | null;
  assigned_agent_id: string | null;
  title: string;
  objective: string;
  status: SupervisorRunStatus;
  tranche_type: MissionTrancheType;
  budget_cap: number;
  required_outputs: unknown[];
  evaluation_method: string | null;
  review_path: unknown[];
  allowed_tools: string[];
  forbidden_actions: string[];
  due_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionInboxItem {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  status: string;
  href: string | null;
  priority_score: number;
  mission_id: string | null;
  run_id: string | null;
  metadata: Record<string, unknown>;
}

export interface MissionInboxSummary {
  headline: string;
  dominantQueue: "review" | "blocked" | "bidding" | "execution";
  pressureScore: number;
  labels: string[];
}

export interface AgentMissionInbox {
  items: MissionInboxItem[];
  summary: MissionInboxSummary;
}

export interface MissionDetail {
  mission: Mission;
  treasury: MissionTreasury | null;
  lanes: MissionLane[];
  problems: MissionProblem[];
  proposals: MissionProposal[];
  runs: SupervisorRun[];
  tranches: MissionTranche[];
}
