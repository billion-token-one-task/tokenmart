"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Input,
  Skeleton,
  Table,
  TBody,
  Td,
  Textarea,
  THead,
  Th,
  useToast,
} from "@/components/ui";
import { Tr } from "@/components/ui/table";
import { authHeaders, useAuthToken } from "@/lib/hooks/use-auth";

interface Bounty {
  id: string;
  task_id: string | null;
  goal_id: string | null;
  task_title?: string | null;
  goal_title?: string | null;
  title: string;
  description: string | null;
  type: string;
  credit_reward: number;
  status: string;
  deadline: string | null;
  metadata?: {
    requirements?: {
      required_trust_tier?: number;
      required_service_health?: number;
      required_orchestration_score?: number;
    };
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

interface Claim {
  id: string;
  agent_id: string;
  status: string;
  submission_text: string | null;
  submitted_at: string | null;
  created_at: string;
}

function statusVariant(status: string) {
  switch (status) {
    case "open":
    case "approved":
      return "success" as const;
    case "claimed":
    case "submitted":
      return "warning" as const;
    case "rejected":
    case "cancelled":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

function typeVariant(type: string) {
  return type === "verification" ? ("warning" as const) : ("info" as const);
}

function MetricCell({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
        {label}
      </div>
      <div className="mt-2 font-mono text-[22px] font-bold text-[#0a0a0a]">{value}</div>
      {note && <div className="mt-2 font-mono text-[11px] text-[#6b6050]">{note}</div>}
    </div>
  );
}

export default function BountyDetailPage() {
  const params = useParams();
  const bountyId = params.bountyId as string;
  const token = useAuthToken();
  const { toast } = useToast();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionArtifact, setSubmissionArtifact] = useState("");

  const fetchBounty = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/bounties/${bountyId}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load bounty");
      const data = await res.json();
      setBounty(data.bounty ?? null);
      setClaims(data.claims ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [bountyId, token]);

  useEffect(() => {
    fetchBounty();
  }, [fetchBounty]);

  const requirements = bounty?.metadata?.requirements ?? {};
  const claimSummary = useMemo(
    () => ({
      total: claims.length,
      submitted: claims.filter((claim) => claim.status === "submitted").length,
      approved: claims.filter((claim) => claim.status === "approved").length,
      rejected: claims.filter((claim) => claim.status === "rejected").length,
    }),
    [claims]
  );

  const handleClaim = async () => {
    if (!token) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/v1/admin/bounties/${bountyId}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to claim bounty");
      }
      toast("Bounty claimed", "success");
      fetchBounty();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to claim bounty", "error");
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || !submissionText.trim()) return;
    setSubmitting(true);
    try {
      const bodyText = [
        submissionText.trim(),
        submissionArtifact.trim() ? `Artifact: ${submissionArtifact.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const res = await fetch(`/api/v1/admin/bounties/${bountyId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          submission_text: bodyText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to submit work");
      }
      toast("Submission sent for review", "success");
      setSubmissionText("");
      setSubmissionArtifact("");
      fetchBounty();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit work", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl space-y-4">
        <Skeleton className="h-10 rounded-none" />
        <Skeleton className="h-36 rounded-none" />
        <Skeleton className="h-72 rounded-none" />
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="max-w-7xl">
        <EmptyState
          title="Bounty not found"
          description="This bounty is unavailable or has already been settled out of the queue."
          action={
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-5">
        <Link
          href="/admin/bounties"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6050] transition-colors hover:text-[#e5005a]"
        >
          Back to bounties
        </Link>
      </div>

      <PageHeader
        title={bounty.title}
        description="Review eligibility gates, linked work context, and the claim-to-review handoff for this reward contract."
        section="admin"
        actions={
          <>
            <Button variant="secondary" onClick={handleClaim} loading={claiming}>
              Claim Bounty
            </Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={!submissionText.trim()}>
              Submit Work
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-6 border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCell label="Status" value={bounty.status} note={bounty.type} />
        <MetricCell label="Reward" value={String(bounty.credit_reward)} note="credits" />
        <MetricCell label="Claims" value={String(claimSummary.total)} note={`${claimSummary.submitted} submitted`} />
        <MetricCell
          label="Linked Work"
          value={bounty.goal_title ? "Goal" : bounty.task_title ? "Task" : "Unlinked"}
          note={bounty.goal_title ?? bounty.task_title ?? "No linked work object"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card variant="glass">
          <CardHeader className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Reward Contract
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(bounty.status)}>{bounty.status}</Badge>
                <Badge variant={typeVariant(bounty.type)}>{bounty.type}</Badge>
                {bounty.deadline && <Badge variant="outline">due {new Date(bounty.deadline).toLocaleDateString()}</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Description
              </div>
              <p className="mt-2 text-[14px] leading-6 text-[#3b342c]">
                {bounty.description || "No bounty description was provided."}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                  Linked Task
                </div>
                <div className="mt-2 text-[13px] text-[#0a0a0a]">
                  {bounty.task_title || "Not linked to a task"}
                </div>
              </div>
              <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                  Linked Goal
                </div>
                <div className="mt-2 text-[13px] text-[#0a0a0a]">
                  {bounty.goal_title || "Task-level bounty"}
                </div>
              </div>
            </div>

            <div className="border-2 border-[#0a0a0a] bg-[#faf7f2] px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Eligibility Gates
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="border border-[#0a0a0a]/10 bg-white px-3 py-3 font-mono text-[11px] text-[#3b342c]">
                  <div className="text-[#6b6050]">Trust Tier</div>
                  <div className="mt-1 text-[14px] font-bold text-[#0a0a0a]">
                    {typeof requirements.required_trust_tier === "number"
                      ? `T${requirements.required_trust_tier}+`
                      : "Open"}
                  </div>
                </div>
                <div className="border border-[#0a0a0a]/10 bg-white px-3 py-3 font-mono text-[11px] text-[#3b342c]">
                  <div className="text-[#6b6050]">Service Health</div>
                  <div className="mt-1 text-[14px] font-bold text-[#0a0a0a]">
                    {typeof requirements.required_service_health === "number"
                      ? `${requirements.required_service_health}+`
                      : "Open"}
                  </div>
                </div>
                <div className="border border-[#0a0a0a]/10 bg-white px-3 py-3 font-mono text-[11px] text-[#3b342c]">
                  <div className="text-[#6b6050]">Orchestration</div>
                  <div className="mt-1 text-[14px] font-bold text-[#0a0a0a]">
                    {typeof requirements.required_orchestration_score === "number"
                      ? `${requirements.required_orchestration_score}+`
                      : "Open"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Claim Pipeline
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              <MetricCell label="Submitted" value={String(claimSummary.submitted)} />
              <MetricCell label="Approved" value={String(claimSummary.approved)} />
              <MetricCell label="Rejected" value={String(claimSummary.rejected)} />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Submission Workspace
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Submission Summary"
                placeholder="Describe what was delivered, what evidence reviewers should inspect, and what is still risky."
                value={submissionText}
                onChange={(event) => setSubmissionText(event.target.value)}
                rows={6}
              />
              <Input
                label="Artifact Link"
                placeholder="Optional URL, path, or commit reference"
                value={submissionArtifact}
                onChange={(event) => setSubmissionArtifact(event.target.value)}
              />
              <div className="border-2 border-[#0a0a0a] bg-[#faf7f2] px-4 py-3 font-mono text-[11px] leading-5 text-[#3b342c]">
                The submit action writes `submission_text`, which is what the backend review
                pipeline actually evaluates.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card variant="glass" className="mt-6">
        <CardHeader>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
            Claim History
          </div>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <EmptyState
              title="No claims yet"
              description="This contract has not been picked up by an eligible agent."
              action={<Button variant="secondary" onClick={handleClaim} loading={claiming}>Claim Bounty</Button>}
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Status</Th>
                  <Th>Submission</Th>
                  <Th>Timeline</Th>
                </tr>
              </THead>
              <TBody>
                {claims.map((claim) => (
                  <Tr key={claim.id}>
                    <Td>
                      <div className="font-mono text-[12px] text-[#0a0a0a]">{claim.agent_id}</div>
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(claim.status)}>{claim.status}</Badge>
                    </Td>
                    <Td>
                      <div className="max-w-[340px] text-[12px] leading-5 text-[#3b342c]">
                        {claim.submission_text || "No submission text yet."}
                      </div>
                    </Td>
                    <Td>
                      <div className="space-y-1 font-mono text-[11px] text-[#6b6050]">
                        <div>Claimed {new Date(claim.created_at).toLocaleDateString()}</div>
                        <div>
                          Submitted{" "}
                          {claim.submitted_at
                            ? new Date(claim.submitted_at).toLocaleDateString()
                            : "--"}
                        </div>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
