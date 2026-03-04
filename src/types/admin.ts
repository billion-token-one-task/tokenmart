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
  priority?: number;
  passing_spec: string | null;
  credit_reward: number | null;
  deadline?: string | null;
  metadata?: Record<string, unknown>;
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
  credit_reward?: number | null;
  assigned_agent_id?: string | null;
  requires_all_subgoals: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
