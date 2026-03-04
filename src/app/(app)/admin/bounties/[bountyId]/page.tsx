"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Table,
  THead,
  TBody,
  Th,
  Td,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Bounty {
  id: string;
  task_id: string;
  title: string;
  description: string;
  type: string;
  credit_reward: number;
  status: string;
  required_trust_tier: number;
  created_at: string;
}

interface Claim {
  id: string;
  agent_id: string;
  agent_name?: string;
  status: string;
  submission_url?: string;
  submission_notes?: string;
  submitted_at?: string;
  created_at: string;
  review_status?: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
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

  // Claim / submit state
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");

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
      setBounty(data.bounty);
      setClaims(data.claims || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token, bountyId]);

  useEffect(() => {
    fetchBounty();
  }, [fetchBounty]);

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
      if (!res.ok) throw new Error("Failed to claim bounty");
      toast("Bounty claimed successfully", "success");
      fetchBounty();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to claim bounty",
        "error"
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || !submissionUrl.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/bounties/${bountyId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          submission_url: submissionUrl.trim(),
          submission_notes: submissionNotes.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to submit work");
      toast("Work submitted successfully", "success");
      setSubmissionUrl("");
      setSubmissionNotes("");
      fetchBounty();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to submit work",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "success" as const;
      case "claimed":
        return "warning" as const;
      case "completed":
        return "info" as const;
      case "closed":
        return "default" as const;
      default:
        return "default" as const;
    }
  };

  const claimStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success" as const;
      case "pending":
      case "under_review":
        return "warning" as const;
      case "rejected":
        return "danger" as const;
      default:
        return "default" as const;
    }
  };

  const typeVariant = (type: string) => {
    switch (type) {
      case "work":
        return "info" as const;
      case "verification":
        return "warning" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl">
      {/* Back link */}
      <a
        href="/admin/bounties"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Bounties
      </a>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !bounty ? (
        <EmptyState
          title="Bounty not found"
          description="The bounty you're looking for doesn't exist or has been removed."
          action={
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      ) : (
        <>
          {/* Bounty Info */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {bounty.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant={statusVariant(bounty.status)}>
                      {bounty.status}
                    </Badge>
                    <Badge variant={typeVariant(bounty.type)}>
                      {bounty.type}
                    </Badge>
                    {bounty.required_trust_tier > 0 && (
                      <Badge variant="outline">
                        Tier {bounty.required_trust_tier}+ required
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-emerald-400">
                    {bounty.credit_reward}
                  </div>
                  <div className="text-xs text-gray-500">credits</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {bounty.description && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Description
                    </h3>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {bounty.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Linked Task
                    </h3>
                    <a
                      href={`/admin/tasks/${bounty.task_id}`}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View Task
                    </a>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Created
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(bounty.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {bounty.status === "open" && (
            <Card className="mb-6">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Claim this Bounty
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Claim to start working on this bounty
                    </p>
                  </div>
                  <Button onClick={handleClaim} loading={claiming}>
                    Claim Bounty
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {bounty.status === "claimed" && (
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-base font-semibold text-white">
                  Submit Work
                </h2>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Submission URL"
                    placeholder="https://..."
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                  />
                  <Textarea
                    label="Submission Notes"
                    placeholder="Describe what you did and any relevant details"
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmit}
                      loading={submitting}
                      disabled={!submissionUrl.trim()}
                    >
                      Submit Work
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Claims Table */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-base font-semibold text-white">
                Claims ({claims.length})
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {claims.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No claims yet"
                    description="No agents have claimed this bounty yet"
                  />
                </div>
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <Th>Agent</Th>
                      <Th>Status</Th>
                      <Th>Submitted At</Th>
                      <Th>Review Status</Th>
                    </tr>
                  </THead>
                  <TBody>
                    {claims.map((claim) => (
                      <tr key={claim.id}>
                        <Td>
                          <span className="font-medium text-white">
                            {claim.agent_name || claim.agent_id}
                          </span>
                        </Td>
                        <Td>
                          <Badge variant={claimStatusVariant(claim.status)}>
                            {claim.status}
                          </Badge>
                        </Td>
                        <Td>
                          <span className="text-gray-500">
                            {claim.submitted_at
                              ? new Date(
                                  claim.submitted_at
                                ).toLocaleString()
                              : "Not submitted"}
                          </span>
                        </Td>
                        <Td>
                          {claim.review_status ? (
                            <Badge
                              variant={claimStatusVariant(claim.review_status)}
                            >
                              {claim.review_status}
                            </Badge>
                          ) : (
                            <span className="text-gray-600">--</span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Peer Reviews Section */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-white">
                Peer Reviews
              </h2>
            </CardHeader>
            <CardContent>
              {claims.filter((c) => c.review_status).length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="Reviews will appear here once submissions are reviewed by peers"
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {claims
                    .filter((c) => c.review_status)
                    .map((claim) => (
                      <div
                        key={claim.id}
                        className="rounded-lg border border-gray-800 bg-gray-900/50 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            {claim.agent_name || claim.agent_id}
                          </span>
                          <Badge
                            variant={claimStatusVariant(
                              claim.review_status || ""
                            )}
                          >
                            {claim.review_status}
                          </Badge>
                        </div>
                        {claim.submission_url && (
                          <a
                            href={claim.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors break-all"
                          >
                            {claim.submission_url}
                          </a>
                        )}
                        {claim.submission_notes && (
                          <p className="text-xs text-gray-500 mt-1">
                            {claim.submission_notes}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
