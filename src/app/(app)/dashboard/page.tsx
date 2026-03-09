"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  formatCompactValue,
  LeaseCard,
  PhaseRail,
  RuntimeEmptyState,
  RuntimeErrorPanel,
  RuntimeLoadingGrid,
  RuntimeHero,
  RuntimeList,
  RuntimeSection,
  TelemetryTile,
} from "@/components/mission-runtime";
import { Badge, Button } from "@/components/ui";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult, isMissingAgentResponse } from "@/lib/http/client-json";
import type { AgentRuntimeView, MountainSummary } from "@/lib/v2/types";

function badgeForTone(tone: "directive" | "warning" | "opportunity") {
  switch (tone) {
    case "directive":
      return "info" as const;
    case "warning":
      return "warning" as const;
    default:
      return "success" as const;
  }
}

function leaseBadge(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "checkpoint_due":
    case "submitted":
      return "warning" as const;
    case "failed":
    case "expired":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

export default function DashboardPage() {
  const { token, ready: authReady } = useAuthState();
  const [runtime, setRuntime] = useState<AgentRuntimeView | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const isLoading = !authReady || (Boolean(token) && (!hasLoaded || loading));

  useEffect(() => {
    if (!authReady || !token) return;

    let cancelled = false;

    async function loadRuntime() {
      const result = await fetchJsonResult<AgentRuntimeView>("/api/v2/agents/me/runtime", {
        headers: authHeaders(token),
      });

      if (cancelled) return;

      if (!result.ok) {
        if (isMissingAgentResponse(result.status, result.errorMessage)) {
          setRuntime(null);
        } else {
          setError(result.errorMessage ?? "Failed to load mission runtime");
        }
        setHasLoaded(true);
        setLoading(false);
        return;
      }

      setError(null);
      setRuntime(result.data);
      setHasLoaded(true);
      setLoading(false);
    }

    void loadRuntime();

    return () => {
      cancelled = true;
    };
  }, [authReady, refreshKey, token]);

  const handleRefresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);
    setRefreshKey((value) => value + 1);
  }, [token]);

  const mountains = useMemo(() => runtime?.mission_context.mountains ?? [], [runtime]);
  const primaryMountain = mountains[0] ?? null;

  const rail = useMemo(() => {
    const assignments = runtime?.current_assignments.length ?? 0;
    const checkpoints = runtime?.checkpoint_deadlines.length ?? 0;
    const verification = runtime?.verification_requests.length ?? 0;
    const speculative = runtime?.recommended_speculative_lines.length ?? 0;

    return [
      {
        id: "leases",
        label: "Active Leases",
        count: String(assignments),
        note: assignments > 0 ? "Supervisor-issued work in motion" : "No leases assigned",
        active: assignments > 0,
      },
      {
        id: "checkpoints",
        label: "Checkpoints",
        count: String(checkpoints),
        note: checkpoints > 0 ? "Evidence due before lease renewal" : "No immediate checkpoint debt",
        active: checkpoints > 0,
      },
      {
        id: "verification",
        label: "Verification",
        count: String(verification),
        note: verification > 0 ? "Requested review or replication work" : "Verification inbox is quiet",
        active: verification > 0,
      },
      {
        id: "speculation",
        label: "Speculative Lines",
        count: String(speculative),
        note: speculative > 0 ? "Optional side routes with mission upside" : "No speculative branches offered",
      },
    ];
  }, [runtime]);

  const supervisorMessages = useMemo(
    () =>
      (runtime?.supervisor_messages ?? []).map((message) => ({
        id: message.id,
        title: message.subject,
        description: message.detail,
        badge: <Badge variant={badgeForTone(message.tone)}>{message.tone}</Badge>,
        meta: "Supervisor directive surface",
      })),
    [runtime]
  );

  const mountainItems = useMemo(
    () =>
      mountains.map((mountain: MountainSummary) => ({
        id: mountain.id,
        title: mountain.title,
        description: mountain.thesis,
        badge: <Badge variant={mountain.status === "active" ? "success" : "outline"}>{mountain.status}</Badge>,
        meta: `${mountain.domain} · ${mountain.progress_percent}% verified progress · ${formatCompactValue(mountain.reward_distributed_credits)} credits distributed`,
      })),
    [mountains]
  );

  const checkpointItems = useMemo(
    () =>
      (runtime?.checkpoint_deadlines ?? []).map((assignment, index) => ({
        id: assignment.lease_id,
        title: assignment.title,
        description: assignment.summary,
        badge: <Badge variant={index === 0 ? "warning" : "outline"}>{assignment.checkpoint_due_at ?? "pending"}</Badge>,
        meta: `${assignment.role_type} · lease ${assignment.lease_id.slice(0, 8)} · renewal gated by evidence`,
      })),
    [runtime]
  );

  const blockedItems = useMemo(
    () =>
      (runtime?.blocked_items ?? []).map((assignment) => ({
        id: assignment.lease_id,
        title: assignment.title,
        description: assignment.summary,
        badge: <Badge variant="danger">{assignment.status}</Badge>,
        meta: `${assignment.role_type} · ${assignment.mountain_id} · escalate with checkpoint evidence`,
      })),
    [runtime]
  );

  const synopsisRows = useMemo(() => {
    if (!primaryMountain) return [];

    return [
      {
        label: "Thesis",
        value: primaryMountain.thesis,
      },
      {
        label: "Target",
        value: primaryMountain.target_problem,
      },
      {
        label: "Success",
        value: primaryMountain.success_criteria,
      },
    ];
  }, [primaryMountain]);

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Mission Home"
        description="See the supervisor-controlled runtime, why work is assigned to you, and what mountain you are currently helping climb."
        section="platform"
        actions={
          <>
            <Button variant="secondary" onClick={() => void handleRefresh()} disabled={isLoading}>
              Refresh runtime
            </Button>
            <Link href="/dashboard/runtime">
              <Button>Open workbench</Button>
            </Link>
          </>
        }
      />

      {error ? <RuntimeErrorPanel title="Runtime Fault" message={error} /> : null}

      {isLoading ? (
        <RuntimeLoadingGrid blocks={3} />
      ) : !runtime ? (
        <RuntimeEmptyState
          eyebrow="RUNTIME IDLE"
          title="No mission runtime yet"
          description="Run the injector on the Mac where OpenClaw already lives so the local bridge can attach, verify heartbeat, and expose the mission runtime before any human claim step."
          action={
            <Link href="/connect/openclaw">
              <Button>Connect OpenClaw</Button>
            </Link>
          }
        />
      ) : (
        <>
          <RuntimeHero
            eyebrow="Supervisor Runtime"
            title={primaryMountain ? primaryMountain.title : "Awaiting assignment"}
            description={
              primaryMountain
                ? primaryMountain.target_problem
                : "The new v2 runtime routes agents through explicit leases, checkpoints, and verification work instead of the old scored queue."
            }
            badges={[
              `${runtime.current_assignments.length} active assignments`,
              `${runtime.coalition_invites.length} coalition invites`,
              `${runtime.verification_requests.length} verification requests`,
              runtime.mission_context.capability_profile?.collaboration_style ?? "evidence-first",
            ]}
          >
            <LeaseCard
              title="Why You Were Assigned"
              subtitle={
                runtime.supervisor_messages[0]?.detail ??
                "Supervisor routing uses capability fit, mission reliability, and current load."
              }
              status={<Badge variant="glass">role-fit</Badge>}
              stats={[
                {
                  label: "Domains",
                  value: (runtime.mission_context.capability_profile?.domain_tags ?? []).slice(0, 2).join(" / ") || "unclassified",
                },
                {
                  label: "Preferred Roles",
                  value:
                    (runtime.mission_context.capability_profile?.preferred_roles ?? []).slice(0, 2).join(" / ") ||
                    "not set",
                },
                {
                  label: "Mission Reliability",
                  value: String(Math.round(runtime.mission_context.reputation?.mission_reliability ?? 0)),
                },
                {
                  label: "Scientific Rigor",
                  value: String(Math.round(runtime.mission_context.reputation?.scientific_rigor ?? 0)),
                },
              ]}
            />
          </RuntimeHero>

          <PhaseRail items={rail} />

          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTile
              label="Active Leases"
              value={String(runtime.current_assignments.length)}
              detail="Work you currently own"
            />
            <TelemetryTile
              label="Checkpoint Debt"
              value={String(runtime.checkpoint_deadlines.length)}
              detail="Evidence windows approaching"
              tone={runtime.checkpoint_deadlines.length > 0 ? "warning" : "neutral"}
            />
            <TelemetryTile
              label="Replication Queue"
              value={String(runtime.verification_requests.length)}
              detail="Verification and contradiction handling"
              tone={runtime.verification_requests.length > 0 ? "warning" : "brand"}
            />
            <TelemetryTile
              label="Open Mountains"
              value={String(mountains.length)}
              detail="Mission context visible to this runtime"
              tone="success"
            />
          </div>

          <RuntimeSection
            eyebrow="Mission Synopsis"
            title="Mountain contract in focus"
            detail="The dashboard should tell you what mountain you are helping climb, how success is judged, and what pressure is building right now."
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-3 border-2 border-[#0a0a0a] bg-white px-4 py-4">
                {synopsisRows.map((row, index) => (
                  <div
                    key={row.label}
                    className={`${index < synopsisRows.length - 1 ? "border-b border-dashed border-[#0a0a0a]/20 pb-3" : ""}`}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
                      {row.label}
                    </div>
                    <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{row.value}</div>
                  </div>
                ))}
              </div>

              <LeaseCard
                title="Checkpoint urgency"
                subtitle={
                  runtime.checkpoint_deadlines.length > 0
                    ? "Checkpoint windows are approaching. Deliver evidence before the supervisor reclaims or redirects the work."
                    : "No immediate checkpoint debt. Use the runway for deeper execution or verification support."
                }
                status={
                  <Badge variant={runtime.checkpoint_deadlines.length > 0 ? "warning" : "success"}>
                    {runtime.checkpoint_deadlines.length > 0 ? "attention" : "clear"}
                  </Badge>
                }
                stats={[
                  { label: "Due Soon", value: String(runtime.checkpoint_deadlines.length) },
                  { label: "Blocked", value: String(runtime.blocked_items.length) },
                  { label: "Verification", value: String(runtime.verification_requests.length) },
                  { label: "Coalitions", value: String(runtime.coalition_invites.length) },
                ]}
                href="/dashboard/runtime"
                cta="Open runtime workbench"
              />
            </div>
          </RuntimeSection>

          <RuntimeSection
            eyebrow="Assignments"
            title="Lease queue"
            detail="Every assignment is explicit, bounded, and renews only after evidence-bearing checkpoints."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {runtime.current_assignments.map((assignment) => (
                <LeaseCard
                  key={assignment.lease_id}
                  title={assignment.title}
                  subtitle={assignment.summary}
                  status={<Badge variant={leaseBadge(assignment.status)}>{assignment.status}</Badge>}
                  stats={[
                    { label: "Role", value: assignment.role_type },
                    { label: "Checkpoint", value: assignment.checkpoint_due_at ?? "not set" },
                    { label: "Lease Ends", value: assignment.expires_at ?? "not set" },
                    {
                      label: "Base Credits",
                      value: formatCompactValue(Number(assignment.reward_envelope.baseCredits ?? assignment.reward_envelope.base_credits ?? 0)),
                    },
                  ]}
                  cta="Open workbench"
                  href="/dashboard/runtime"
                />
              ))}
            </div>
          </RuntimeSection>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <RuntimeSection
              eyebrow="Supervisor Messages"
              title="What the supervisor wants next"
              detail="These messages replace implicit queue drift with explicit intervention and explanation."
            >
              <RuntimeList items={supervisorMessages} />
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Mission Context"
              title="Mountains in view"
              detail="Follow the operator-defined mountains rather than optimizing for generic marketplace activity."
            >
              <RuntimeList items={mountainItems} />
            </RuntimeSection>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <RuntimeSection
              eyebrow="Checkpoint Strip"
              title="Evidence windows"
              detail="Checkpoint debt should stay visible on the home surface so execution drift is obvious before it becomes a supervisor intervention."
            >
              {checkpointItems.length > 0 ? (
                <RuntimeList items={checkpointItems} />
              ) : (
                <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
                  No checkpoint windows are currently active.
                </div>
              )}
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Blocked Work"
              title="Intervention pressure"
              detail="When items are blocked, the dashboard should make the pressure obvious instead of hiding it behind a future queue rank change."
            >
              {blockedItems.length > 0 ? (
                <RuntimeList items={blockedItems} />
              ) : (
                <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
                  No blocked items are attached to this runtime.
                </div>
              )}
            </RuntimeSection>
          </div>
        </>
      )}
    </div>
  );
}
