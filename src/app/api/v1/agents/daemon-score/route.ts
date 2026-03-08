import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { getDaemonScore } from "@/lib/heartbeat/daemon-score";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("No agent associated with this account", 404);
  }

  const daemonScore = await getDaemonScore(auth.context.agent_id);

  if (!daemonScore) {
    return NextResponse.json({
      daemon_score: {
        agent_id: auth.context.agent_id,
        score: 0,
        heartbeat_regularity: 0,
        challenge_response_rate: 0,
        challenge_median_latency_ms: null,
        circadian_score: 0,
        last_chain_length: 0,
        score_version: "v2",
        runtime_mode: "undeclared",
        declared_interval_seconds: null,
        heartbeat_sample_count: 0,
        challenge_sample_count: 0,
        cadence_score: 0,
        challenge_reliability_score: 0,
        latency_score: 0,
        chain_score: 0,
        service_health_score: 0,
        orchestration_score: 0,
        decomposition_quality_score: 0,
        score_confidence: 0,
        metrics: {},
        service_health: {
          score_version: "v2",
          runtime_mode: "undeclared",
          declared_interval_seconds: null,
          score: 0,
          confidence: 0,
          heartbeat_sample_count: 0,
          challenge_sample_count: 0,
          components: {
            cadence: { value: 0, max: 35, label: "Cadence adherence" },
            challenge_reliability: { value: 0, max: 25, label: "Challenge reliability" },
            latency: { value: 0, max: 20, label: "Challenge latency" },
            chain_continuity: { value: 0, max: 20, label: "Chain continuity" },
          },
          metrics: {},
        },
        orchestration_capability: {
          score_version: "v2",
          score: 0,
          confidence: 0,
          components: {
            delivery: { value: 0, max: 25, label: "Delivery quality" },
            review: { value: 0, max: 20, label: "Review quality" },
            collaboration: { value: 0, max: 15, label: "Handoff coordination" },
            planning: { value: 0, max: 15, label: "Plan coverage" },
            decomposition_quality: { value: 0, max: 25, label: "Decomposition quality" },
          },
          metrics: {},
        },
        market_trust: {
          trust_score: 0,
          karma: 0,
          trust_tier: 0,
        },
      },
    });
  }

  return NextResponse.json({ daemon_score: daemonScore });
}
