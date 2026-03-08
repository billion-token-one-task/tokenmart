function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 4) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

export interface ProposalScoreInput {
  requestedCredits: number;
  budgetCap: number;
  confidence: number;
  fitScore: number;
  priorVerifiedScore: number;
  diversityScore: number;
  correlationRisk: number;
  verificationReadiness: number;
  expectedValue: number;
}

export interface ProposalScoreResult {
  score: number;
  status: "competitive" | "viable" | "weak";
  reasons: string[];
}

export function computeProposalScore(input: ProposalScoreInput): ProposalScoreResult {
  const budgetEfficiency =
    input.budgetCap <= 0 ? 0 : clamp(1 - input.requestedCredits / input.budgetCap, 0, 1);
  const fit = clamp(input.fitScore);
  const confidence = clamp(input.confidence);
  const priorVerified = clamp(input.priorVerifiedScore);
  const diversity = clamp(input.diversityScore);
  const correlationPenalty = clamp(input.correlationRisk);
  const verification = clamp(input.verificationReadiness);
  const value = clamp(input.expectedValue);

  const rawScore =
    fit * 0.23 +
    value * 0.22 +
    budgetEfficiency * 0.16 +
    confidence * 0.12 +
    priorVerified * 0.11 +
    diversity * 0.09 +
    verification * 0.12 -
    correlationPenalty * 0.18;

  const score = round(clamp(rawScore, 0, 1));
  const status = score >= 0.7 ? "competitive" : score >= 0.5 ? "viable" : "weak";
  const reasons = [
    fit >= 0.7 ? `Strong fit to lane and work package (${Math.round(fit * 100)}%)` : null,
    budgetEfficiency >= 0.5
      ? `Efficient use of requested credits (${Math.round(budgetEfficiency * 100)}%)`
      : null,
    diversity >= 0.65 ? "Approach adds useful diversity to the mission portfolio" : null,
    verification >= 0.65 ? "Proposal is verification-ready and review-conscious" : null,
    correlationPenalty >= 0.45
      ? `High correlation risk reduces ranking confidence (${Math.round(correlationPenalty * 100)}%)`
      : null,
  ].filter((value): value is string => Boolean(value));

  if (reasons.length === 0) {
    reasons.push("Proposal score reflects mixed fit, confidence, and budget efficiency signals");
  }

  return { score, status, reasons };
}

export interface MissionEligibilityInput {
  laneFrozen: boolean;
  missionTrustScore: number;
  orchestrationScore: number;
  serviceHealthScore: number;
  requiredMissionTrust: number;
  requiredOrchestration: number;
  requiredServiceHealth: number;
}

export interface MissionEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export function deriveMissionEligibility(
  input: MissionEligibilityInput,
): MissionEligibilityResult {
  const reasons: string[] = [];

  if (input.laneFrozen) {
    reasons.push("Lane is currently frozen by admin treasury controls");
  }

  if (input.missionTrustScore < input.requiredMissionTrust) {
    reasons.push(
      `mission trust is below the required floor (${Math.round(input.missionTrustScore * 100)}% < ${Math.round(input.requiredMissionTrust * 100)}%)`,
    );
  }

  if (input.orchestrationScore < input.requiredOrchestration) {
    reasons.push(
      `Orchestration score is below the required floor (${Math.round(input.orchestrationScore * 100)}% < ${Math.round(input.requiredOrchestration * 100)}%)`,
    );
  }

  if (input.serviceHealthScore < input.requiredServiceHealth) {
    reasons.push(
      `Service health is below the required floor (${Math.round(input.serviceHealthScore * 100)}% < ${Math.round(input.requiredServiceHealth * 100)}%)`,
    );
  }

  if (reasons.length === 0) {
    reasons.push("Agent is eligible for this mission lane under current policy");
  }

  return {
    eligible: reasons.length === 1 && reasons[0].includes("eligible"),
    reasons,
  };
}

export interface NextTrancheActionInput {
  trancheKind: "planning" | "exploration" | "execution" | "verification" | "impact_bonus";
  releasedAmount: number;
  spentAmount: number;
  reservedAmount: number;
  reviewStatus:
    | "active"
    | "waiting_for_review"
    | "rework_requested"
    | "verified"
    | "reconciled"
    | "blocked";
  emergencyFreeze: boolean;
}

export interface NextTrancheActionResult {
  action: "freeze" | "hold" | "release_next";
  reason: string;
}

export function getNextTrancheAction(
  input: NextTrancheActionInput,
): NextTrancheActionResult {
  if (input.emergencyFreeze) {
    return {
      action: "freeze",
      reason: "Mission treasury is under emergency freeze; no further tranche release is allowed",
    };
  }

  if (
    input.reviewStatus === "waiting_for_review" ||
    input.reviewStatus === "rework_requested" ||
    input.reviewStatus === "blocked"
  ) {
    return {
      action: "hold",
      reason: "Tranche remains on hold until review or blocker resolution is complete",
    };
  }

  const releasedUtilization =
    input.releasedAmount <= 0 ? 0 : clamp(input.spentAmount / input.releasedAmount, 0, 1);
  const hasOpenReservations = input.reservedAmount > 0;

  if (input.reviewStatus === "verified" || input.reviewStatus === "reconciled") {
    return {
      action: "release_next",
      reason: `Current ${input.trancheKind} tranche is ${input.reviewStatus}; the next tranche can be released`,
    };
  }

  if (releasedUtilization >= 0.7 && !hasOpenReservations) {
    return {
      action: "release_next",
      reason: `Released ${input.trancheKind} budget is materially utilized and unreserved, so the next tranche can open`,
    };
  }

  return {
    action: "hold",
    reason: `Keep the ${input.trancheKind} tranche open until more of the released budget is consumed or verified`,
  };
}
