export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type GoalStatus = "pending" | "in_progress" | "completed" | "failed" | "open" | "skipped";
export type BountyStatus =
  | "open"
  | "claimed"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "in_progress"
  | "under_review"
  | "expired";
export type BountyType = "work" | "verification";
export type BountyClaimStatus =
  | "claimed"
  | "submitted"
  | "approved"
  | "rejected";
export type ReviewDecision = "approve" | "reject";

export interface Task {
  id: string;
  title: string;
  description: string;
  created_by: string;
  status: TaskStatus;
  priority: number;
  passing_spec: string | null;
  credit_reward: number | null;
  assigned_to?: string | null;
  deadline?: string | null;
  methodology_version: string;
  metadata?: Record<string, unknown>;
  input_spec: unknown[];
  output_spec: unknown[];
  retry_policy: Record<string, unknown>;
  verification_method: string | null;
  verification_target: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  task_id: string;
  parent_goal_id: string | null;
  path: string;
  depth: number;
  title: string;
  description: string | null;
  passing_spec: string | null;
  status: GoalStatus;
  credit_reward: number | null;
  assigned_agent_id: string | null;
  requires_all_subgoals: boolean;
  evidence: unknown[];
  input_spec: unknown[];
  output_spec: unknown[];
  retry_policy: Record<string, unknown>;
  verification_method: string | null;
  verification_target: string | null;
  orchestration_role: string;
  node_type: string;
  blocked_reason: string | null;
  completion_confidence: number | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GoalDependency {
  id: string;
  goal_id: string;
  depends_on_goal_id: string;
  dependency_kind: string;
  created_at: string;
}

export interface ExecutionPlan {
  id: string;
  task_id: string;
  created_by: string | null;
  agent_id: string | null;
  status: string;
  methodology_version: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExecutionPlanNode {
  id: string;
  plan_id: string;
  goal_id: string | null;
  parent_node_id: string | null;
  node_key: string;
  title: string;
  description: string | null;
  node_type: string;
  orchestration_role: string;
  status: string;
  assigned_agent_id: string | null;
  priority: number;
  confidence: number | null;
  budget_credits: number | null;
  budget_minutes: number | null;
  actual_minutes: number | null;
  passing_spec: string | null;
  evidence: unknown[];
  input_spec: unknown[];
  output_spec: unknown[];
  retry_policy: Record<string, unknown>;
  verification_method: string | null;
  verification_target: string | null;
  rework_count: number;
  handoff_count: number;
  successful_handoff_count: number;
  duplicate_overlap_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExecutionPlanReview {
  id: string;
  plan_id: string;
  review_type: string;
  reviewer_agent_id: string | null;
  reviewer_account_id: string | null;
  decision: string;
  score: number | null;
  summary: string | null;
  evidence_findings: unknown[];
  created_at: string;
  submitted_at: string | null;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  type: BountyType;
  task_id: string | null;
  goal_id: string | null;
  created_by: string;
  credit_reward: number;
  status: BountyStatus;
  deadline: string | null;
  max_claimants?: number;
  metadata?: Record<string, unknown>;
  task_title?: string | null;
  goal_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BountyClaim {
  id: string;
  bounty_id: string;
  agent_id: string;
  status: BountyClaimStatus;
  submission_data?: Record<string, unknown> | null;
  submitted_at: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  credits_awarded?: number | null;
  created_at: string;
}

export interface PeerReview {
  id: string;
  bounty_claim_id: string;
  reviewer_agent_id: string;
  decision: ReviewDecision | null;
  review_notes: string | null;
  submitted_at: string | null;
  reviewer_reward_credits: number | null;
  created_at: string;
}
