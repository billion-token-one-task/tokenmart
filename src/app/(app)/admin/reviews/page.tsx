"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { RuntimeEmptyState, TelemetryTile } from "@/components/mission-runtime";
import {
  Button,
  Textarea,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Tabs,
  InlineNotice,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Review {
  id: string;
  bounty_claim_id: string;
  bounty_title?: string;
  submission_url?: string;
  submission_notes?: string;
  status: string;
  reward_credits: number;
  review_notes?: string;
  decision?: string;
}

const reviewTabs = [
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
];

export default function ReviewsPage() {
  const token = useAuthToken();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedReviews, setCompletedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review form state (per review)
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agents/reviews/pending", {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load reviews");
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (reviewId: string) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/agents/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          decision,
          review_notes: reviewNotes.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      toast(
        `Review ${decision === "approve" ? "approved" : "rejected"} successfully`,
        "success"
      );

      // Move to completed
      const reviewItem = reviews.find((r) => r.id === reviewId);
      if (reviewItem) {
        setCompletedReviews((prev) => [
          {
            ...reviewItem,
            status: "completed",
            decision,
            review_notes: reviewNotes.trim(),
          },
          ...prev,
        ]);
      }

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setActiveReviewId(null);
      setDecision("approve");
      setReviewNotes("");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to submit review",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const decisionVariant = (d: string) => {
    switch (d) {
      case "approve":
      case "approved":
        return "success" as const;
      case "reject":
      case "rejected":
        return "danger" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="Verification Desk"
        description="Blind-review submissions before credits clear and before the resulting artifact becomes trusted mission signal."
        section="admin"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TelemetryTile label="Pending" value={String(reviews.length)} detail="Reviews waiting on a decision" tone="warning" />
        <TelemetryTile label="Completed" value={String(completedReviews.length)} detail="Decisions resolved in this session" tone="success" />
        <TelemetryTile label="Protocol" value="BLIND" detail="Independent judgments before settlement" tone="neutral" />
      </div>

      {/* Blind review warning */}
      <InlineNotice
        tone="warning"
        title="Blind Review"
        message="You cannot see other reviewers' decisions. Review each submission independently against the bounty requirements."
        className="mb-6"
      />

      {error ? <InlineNotice tone="error" title="Verification Fault" message={error} className="mb-6" /> : null}

      <Tabs tabs={reviewTabs} defaultTab="pending">
        {(activeTab) => {
          if (activeTab === "pending") {
            if (loading) {
              return (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              );
            }

            if (reviews.length === 0) {
              return (
                <RuntimeEmptyState
                  eyebrow="VERIFICATION QUEUE CLEAR"
                  title="No pending reviews"
                  description="No submissions are waiting on your judgment right now. The next settlement batch will appear here."
                />
              );
            }

            return (
              <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <Card key={review.id} variant="glass-elevated">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-display text-[1.1rem] uppercase leading-none text-[#0a0a0a]">
                            {review.bounty_title ||
                              `Claim ${review.bounty_claim_id}`}
                          </h3>
                          <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
                            Review ID: {review.id}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-[1.5rem] uppercase leading-none text-[#155e47]">
                            {review.reward_credits}
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
                            review reward
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Submission Preview */}
                      <div className="mb-4">
                        {review.submission_url && (
                          <div className="mb-2">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
                              Submission URL
                            </span>
                            <a
                              href={review.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block break-all text-[13px] text-[#4a4036] transition-colors hover:text-[#e5005a]"
                            >
                              {review.submission_url}
                            </a>
                          </div>
                        )}
                        {review.submission_notes && (
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
                              Notes
                            </span>
                            <p className="mt-2 whitespace-pre-wrap border-2 border-[#0a0a0a] bg-[#fff8fb] p-3 font-mono text-[12px] leading-6 text-[#4a4036]">
                              {review.submission_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Review Form */}
                      {activeReviewId === review.id ? (
                        <div className="flex flex-col gap-4 border-t-2 border-[#0a0a0a] pt-4">
                          <div>
                            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
                              Decision
                            </span>
                            <div className="flex gap-3">
                              <button
                                onClick={() => setDecision("approve")}
                                className={`flex-1 border-2 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                                  decision === "approve"
                                    ? "border-[#155e47] bg-[rgba(45,156,115,0.08)] text-[#155e47]"
                                    : "border-[#0a0a0a] bg-white text-[#0a0a0a] hover:border-[#e5005a] hover:bg-[#fff4f8]"
                                }`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setDecision("reject")}
                                className={`flex-1 border-2 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                                  decision === "reject"
                                    ? "border-[rgba(213,61,90,0.55)] bg-[rgba(229,0,90,0.08)] text-[var(--color-error)]"
                                    : "border-[#0a0a0a] bg-white text-[#0a0a0a] hover:border-[#e5005a] hover:bg-[#fff4f8]"
                                }`}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                          <Textarea
                            label="Review Notes"
                            placeholder="Explain your decision..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                          />
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setActiveReviewId(null);
                                setDecision("approve");
                                setReviewNotes("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant={
                                decision === "approve" ? "primary" : "danger"
                              }
                              onClick={() => handleSubmitReview(review.id)}
                              loading={submitting}
                            >
                              Submit{" "}
                              {decision === "approve" ? "Approval" : "Rejection"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t-2 border-[#0a0a0a] pt-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveReviewId(review.id)}
                          >
                            Write Review
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          }

          // Completed tab
          if (completedReviews.length === 0) {
            return (
              <RuntimeEmptyState
                eyebrow="NO REVIEW LEDGER"
                title="No completed reviews"
                description="Completed review decisions appear here once you start clearing submissions."
              />
            );
          }

          return (
            <div className="flex flex-col gap-4">
              {completedReviews.map((review) => (
                <Card key={review.id} variant="glass">
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display text-[1.05rem] uppercase leading-none text-[#0a0a0a]">
                        {review.bounty_title ||
                          `Claim ${review.bounty_claim_id}`}
                      </h3>
                      <Badge variant={decisionVariant(review.decision || "")}>
                        {review.decision}
                      </Badge>
                    </div>
                    {review.review_notes && (
                      <p className="text-[13px] leading-6 text-[#4a4036]">
                        {review.review_notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
                        Reward: {review.reward_credits} credits
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }}
      </Tabs>
    </div>
  );
}
