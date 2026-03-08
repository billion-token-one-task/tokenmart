function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 1) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

export interface MissionProposalScoreInput {
  requestedCredits: number;
  estimatedImpact: number;
  laneFit: number;
  confidence: number;
  priorMissionTrust: number;
  priorOrchestrationCapability: number;
  diversityBoost: number;
  correlationRisk: number;
}

export function calculateMissionProposalScore(
  input: MissionProposalScoreInput,
): number {
  const costEfficiency = clamp(1 - input.requestedCredits / 500, 0, 1);
  const weightedSignal =
    input.estimatedImpact * 26 +
    input.laneFit * 18 +
    input.confidence * 15 +
    input.priorMissionTrust * 10 +
    input.priorOrchestrationCapability * 9 +
    costEfficiency * 13 +
    input.diversityBoost * 6;
  const penalties = input.correlationRisk * 14.5;

  return round(clamp(weightedSignal - penalties, 0, 100));
}

export interface MissionProposalCandidate {
  id: string;
  requestedCredits: number;
  confidence: number;
  laneFit: number;
  verifiedPerformance: number;
  diversityBoost: number;
  correlationRisk: number;
  reviewLoadPenalty: number;
  expectedValue: number;
}

export interface RankedMissionProposal extends MissionProposalCandidate {
  rankingScore: number;
}

export function rankMissionProposals(
  proposals: MissionProposalCandidate[],
  input: {
    budgetCeiling: number;
    reviewCapacity: number;
  },
): RankedMissionProposal[] {
  const budgetCeiling = Math.max(1, input.budgetCeiling);
  const reviewCapacity = clamp(input.reviewCapacity, 0, 1);

  return [...proposals]
    .map((proposal) => {
      const costEfficiency = clamp(
        1 - proposal.requestedCredits / budgetCeiling,
        0,
        1,
      );
      const rankingScore = round(
        clamp(
          proposal.expectedValue * 26 +
            proposal.laneFit * 24 +
            proposal.confidence * 16 +
            proposal.verifiedPerformance * 14 +
            costEfficiency * 12 +
            proposal.diversityBoost * 5 +
            reviewCapacity * 5 -
            proposal.correlationRisk * 14 -
            proposal.reviewLoadPenalty * 8,
          0,
          100,
        ),
      );

      return {
        ...proposal,
        rankingScore,
      };
    })
    .sort((left, right) => right.rankingScore - left.rankingScore);
}

export interface MissionEligibilityDecision {
  eligible: boolean;
  reasons: string[];
}

export function deriveMissionEligibility(input: {
  serviceHealth: number;
  orchestrationCapability: number;
  missionTrust: number;
  marketTrust: number;
  reviewerLoad: number;
  correlationRisk: number;
  minimums: {
    serviceHealth: number;
    orchestrationCapability: number;
    missionTrust: number;
    marketTrust: number;
    maxCorrelationRisk: number;
    maxReviewerLoad: number;
  };
}): MissionEligibilityDecision {
  const reasons: string[] = [];

  if (input.serviceHealth < input.minimums.serviceHealth) {
    reasons.push(
      `service health ${input.serviceHealth} is below required ${input.minimums.serviceHealth}`,
    );
  }
  if (input.orchestrationCapability < input.minimums.orchestrationCapability) {
    reasons.push(
      `orchestration capability ${input.orchestrationCapability} is below required ${input.minimums.orchestrationCapability}`,
    );
  }
  if (input.missionTrust < input.minimums.missionTrust) {
    reasons.push(
      `mission trust ${input.missionTrust} is below required ${input.minimums.missionTrust}`,
    );
  }
  if (input.marketTrust < input.minimums.marketTrust) {
    reasons.push(
      `market trust ${input.marketTrust} is below required ${input.minimums.marketTrust}`,
    );
  }
  if (input.correlationRisk > input.minimums.maxCorrelationRisk) {
    reasons.push(
      `correlation risk ${round(input.correlationRisk, 2)} exceeds allowed ${round(input.minimums.maxCorrelationRisk, 2)}`,
    );
  }
  if (input.reviewerLoad > input.minimums.maxReviewerLoad) {
    reasons.push(
      `reviewer load ${round(input.reviewerLoad, 2)} exceeds allowed ${round(input.minimums.maxReviewerLoad, 2)}`,
    );
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export type MissionTreasuryHealth = "healthy" | "constrained" | "frozen";

export interface MissionTreasuryHealthInput {
  totalCredits: number;
  reservedCredits: number;
  burnedCredits: number;
  frozen: boolean;
}

export function classifyMissionTreasuryHealth(
  input: MissionTreasuryHealthInput,
): MissionTreasuryHealth {
  if (input.frozen) return "frozen";

  const available = Math.max(
    0,
    input.totalCredits - input.reservedCredits - input.burnedCredits,
  );
  const availableRatio =
    input.totalCredits > 0 ? available / input.totalCredits : 0;

  return availableRatio <= 0.15 ? "constrained" : "healthy";
}

export interface MissionInboxSummaryInput {
  missionCount: number;
  activeRuns: number;
  blockedRuns: number;
  pendingClarifications: number;
  pendingReviews: number;
  openBids: number;
  fundedRuns: number;
}

export interface MissionInboxSummary {
  headline: string;
  dominantQueue: "review" | "blocked" | "bidding" | "execution";
  pressureScore: number;
  labels: string[];
}

export function buildMissionInboxSummary(
  input: MissionInboxSummaryInput,
): MissionInboxSummary {
  const reviewPressure = input.pendingReviews * 8;
  const blockedPressure = input.blockedRuns * 10 + input.pendingClarifications * 6;
  const bidPressure = input.openBids * 4;
  const executionPressure = input.activeRuns * 3 + input.fundedRuns * 2;

  const dominantQueue =
    reviewPressure >= blockedPressure &&
    reviewPressure >= bidPressure &&
    reviewPressure >= executionPressure
      ? "review"
      : blockedPressure >= bidPressure && blockedPressure >= executionPressure
        ? "blocked"
        : bidPressure >= executionPressure
          ? "bidding"
          : "execution";

  const rawPressure =
    reviewPressure + blockedPressure + bidPressure + executionPressure;
  const pressureScore = Math.round(clamp((rawPressure / 170) * 100, 0, 100));
  const labels = [
    ...(input.pendingReviews >= 4 ? ["review-heavy"] : []),
    ...(input.blockedRuns > 0 ? ["blocked-work"] : []),
    ...(input.openBids >= 5 ? ["bid-active"] : []),
  ];

  return {
    headline: `${input.missionCount} missions · ${input.openBids} open bids · ${input.pendingReviews} pending reviews`,
    dominantQueue,
    pressureScore,
    labels,
  };
}

export interface MissionInboxItem {
  id: string;
  kind: string;
  urgency: number;
  missionPriority: number;
  dependencyPressure: number;
  reviewPressure: number;
  blocked: boolean;
  title: string;
}

export interface PrioritizedMissionInboxItem extends MissionInboxItem {
  priorityScore: number;
}

export function prioritizeMissionInbox(
  items: MissionInboxItem[],
): PrioritizedMissionInboxItem[] {
  return [...items]
    .map((item) => {
      const priorityScore = round(
        clamp(
          item.urgency * 30 +
            item.missionPriority * 25 +
            item.dependencyPressure * 18 +
            item.reviewPressure * 12 +
            (item.blocked ? 15 : 0),
          0,
          100,
        ),
      );

      return {
        ...item,
        priorityScore,
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);
}
