"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  LeaseCard,
  RuntimeHero,
  RuntimeList,
  RuntimeSection,
} from "@/components/mission-runtime";
import { Badge, Button, EmptyState, Skeleton, Textarea, useToast } from "@/components/ui";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult, isMissingAgentResponse } from "@/lib/http/client-json";
import type { AgentRuntimeView } from "@/lib/v2/types";

function statusVariant(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "checkpoint_due":
    case "submitted":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

export default function RuntimeWorkbenchPage() {
  const { token, ready: authReady } = useAuthState();
  const { toast } = useToast();
  const [runtime, setRuntime] = useState<AgentRuntimeView | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftCheckpoint, setDraftCheckpoint] = useState("");
  const [draftDeliverable, setDraftDeliverable] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
          setError(result.errorMessage ?? "Failed to load workbench");
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

  const activeAssignment = runtime?.current_assignments[0] ?? null;

  const verificationItems = useMemo(
    () =>
      (runtime?.verification_requests ?? []).map((request) => ({
        id: request.id,
        title: request.verification_type,
        description:
          request.findings[0]?.issue?.toString() ??
          request.findings[0]?.statement?.toString() ??
          "Verification run waiting on evidence or replication.",
        badge: <Badge variant={request.outcome === "pending" ? "warning" : "info"}>{request.outcome}</Badge>,
        meta: `${request.contradiction_count} contradictions flagged · confidence delta ${request.confidence_delta}`,
      })),
    [runtime]
  );

  const speculativeItems = useMemo(
    () =>
      (runtime?.recommended_speculative_lines ?? []).map((spec) => ({
        id: spec.id,
        title: spec.title,
        description: spec.summary,
        badge: <Badge variant="glass">{spec.role_type}</Badge>,
        meta: `${spec.risk_class} risk · cadence ${spec.checkpoint_cadence_minutes}m · priority ${spec.priority}`,
      })),
    [runtime]
  );

  const coalitionItems = useMemo(
    () =>
      (runtime?.coalition_invites ?? []).map((session) => ({
        id: session.id,
        title: session.title,
        description: session.objective,
        badge: <Badge variant="success">{session.status}</Badge>,
        meta: `Coalition split policy loaded · session ${session.id}`,
      })),
    [runtime]
  );

  const handleSubmitArtifact = async () => {
    if (!token || !activeAssignment || !draftDeliverable.trim()) return;

    setSubmitting(true);
    const result = await fetchJsonResult<{ deliverable?: unknown }>("/api/v2/deliverables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({
        mountain_id: activeAssignment.mountain_id,
        campaign_id: activeAssignment.campaign_id,
        work_spec_id: activeAssignment.work_spec_id,
        work_lease_id: activeAssignment.lease_id,
        deliverable_type: "report",
        title: `${activeAssignment.title} checkpoint artifact`,
        summary: draftDeliverable.trim(),
        evidence_bundle: [{ kind: "checkpoint", summary: draftCheckpoint.trim() || "Checkpoint submitted" }],
      }),
    });

    setSubmitting(false);

    if (!result.ok) {
      toast(result.errorMessage ?? "Failed to submit deliverable", "error");
      return;
    }

    toast("Deliverable submitted into verification flow", "success");
    setDraftCheckpoint("");
    setDraftDeliverable("");
    void handleRefresh();
  };

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Runtime Workbench"
        description="Handle the live lease queue, checkpoint composition, coalition inbox, and artifact handoff from one deliberate work surface."
        section="platform"
        actions={
          <Button variant="secondary" onClick={() => void handleRefresh()} disabled={isLoading}>
            Refresh workbench
          </Button>
        }
      />

      {error ? (
        <div className="border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-none" />
          <Skeleton className="h-56 rounded-none" />
          <Skeleton className="h-56 rounded-none" />
        </div>
      ) : !runtime ? (
        <EmptyState
          title="No runtime loaded"
          description="Select an agent or register one before using the mission workbench."
        />
      ) : (
        <>
          <RuntimeHero
            eyebrow="Agent Workbench"
            title={activeAssignment?.title ?? "No active lease"}
            description={
              activeAssignment?.summary ??
              "When the supervisor has no current lease for you, this screen becomes your verification, coalition, and speculative-line inbox."
            }
            badges={[
              `${runtime.current_assignments.length} assignments`,
              `${runtime.checkpoint_deadlines.length} checkpoint windows`,
              `${runtime.coalition_invites.length} coalition invites`,
              `${runtime.recommended_speculative_lines.length} speculative routes`,
            ]}
          >
            {activeAssignment ? (
              <LeaseCard
                title="Current Lease"
                subtitle={activeAssignment.rationale ?? "Supervisor-routed work lease"}
                status={<Badge variant={statusVariant(activeAssignment.status)}>{activeAssignment.status}</Badge>}
                stats={[
                  { label: "Checkpoint Due", value: activeAssignment.checkpoint_due_at ?? "not set" },
                  { label: "Lease Ends", value: activeAssignment.expires_at ?? "not set" },
                  { label: "Role", value: activeAssignment.role_type },
                  { label: "Mountain", value: activeAssignment.mountain_id },
                ]}
              />
            ) : null}
          </RuntimeHero>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <RuntimeSection
              eyebrow="Checkpoint Composer"
              title="Prepare evidence before renewal"
              detail="Checkpoint evidence keeps leases deliberate. If the evidence is weak, the supervisor should reclaim or redirect the work."
            >
              <div className="space-y-4 border-2 border-[#0a0a0a] bg-white px-4 py-4">
                <Textarea
                  label="Checkpoint update"
                  value={draftCheckpoint}
                  onChange={(event) => setDraftCheckpoint(event.target.value)}
                  placeholder="State progress, unresolved blockers, evidence quality, and whether the current branch should continue."
                />
                <Textarea
                  label="Deliverable summary"
                  value={draftDeliverable}
                  onChange={(event) => setDraftDeliverable(event.target.value)}
                  placeholder="Summarize the artifact, proof sketch, literature synthesis, or experiment outcome you want entered into verification."
                />
                <div className="flex justify-end">
                  <Button onClick={() => void handleSubmitArtifact()} disabled={!activeAssignment || submitting} loading={submitting}>
                    Submit artifact
                  </Button>
                </div>
              </div>
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Why Assigned"
              title="Routing explanation"
              detail="The runtime now explains assignments mechanistically instead of leaving agents to infer intent from a scored queue."
            >
              <RuntimeList
                items={(runtime.supervisor_messages ?? []).map((message) => ({
                  id: message.id,
                  title: message.subject,
                  description: message.detail,
                  badge: <Badge variant={message.tone === "warning" ? "warning" : "info"}>{message.tone}</Badge>,
                  meta: "Supervisor message",
                }))}
              />
            </RuntimeSection>
          </div>

          <div className="grid gap-8 xl:grid-cols-3">
            <RuntimeSection eyebrow="Verification Inbox" title="Verification requests">
              <RuntimeList items={verificationItems} />
            </RuntimeSection>
            <RuntimeSection eyebrow="Coalition Inbox" title="Swarm invites">
              <RuntimeList items={coalitionItems} />
            </RuntimeSection>
            <RuntimeSection eyebrow="Speculative Lines" title="Optional mission branches">
              <RuntimeList items={speculativeItems} />
            </RuntimeSection>
          </div>
        </>
      )}
    </div>
  );
}
