"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Textarea,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Tabs,
  EmptyState,
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
    <div className="max-w-4xl">
      <PageHeader
        title="Peer Reviews"
        description="Blind-review submissions before credits clear and trust moves through the market."
      />

      {/* Blind review warning */}
      <div className="mb-6 rounded-[8px] border border-[#f5a623]/20 bg-[#f5a623]/5 px-4 py-3 text-[13px] text-[#f5a623] flex items-start gap-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="shrink-0 mt-0.5"
        >
          <path
            d="M10 3L2 17h16L10 3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 8v4M10 14v.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <div>
          <p className="font-medium text-[#f5a623]">Blind Review</p>
          <p className="text-[13px] text-[#f5a623]/70 mt-0.5">
            You cannot see other reviewers&apos; decisions. Review each
            submission independently based on the bounty requirements.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-[8px] border border-[#ee0000]/20 bg-[#ee0000]/5 px-4 py-3 text-[13px] text-[#ee0000] font-mono">
          {error}
        </div>
      )}

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
                <EmptyState
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
                          <h3 className="text-[13px] font-medium text-[#ededed]">
                            {review.bounty_title ||
                              `Claim ${review.bounty_claim_id}`}
                          </h3>
                          <span className="text-[13px] text-[#666] mt-1 font-mono">
                            Review ID: {review.id}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-[#50e3c2] font-mono">
                            {review.reward_credits}
                          </div>
                          <div className="text-[13px] text-[#666]">
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
                            <span className="text-[13px] font-medium text-[#666]">
                              Submission URL
                            </span>
                            <a
                              href={review.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[13px] text-[#0070f3] hover:text-[#0070f3]/80 transition-colors mt-1 break-all"
                            >
                              {review.submission_url}
                            </a>
                          </div>
                        )}
                        {review.submission_notes && (
                          <div>
                            <span className="text-[13px] font-medium text-[#666]">
                              Notes
                            </span>
                            <p className="text-[13px] text-[#a1a1a1] mt-1 whitespace-pre-wrap bg-[rgba(255,255,255,0.02)] rounded-[8px] p-3 border border-[rgba(255,255,255,0.06)] font-mono">
                              {review.submission_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Review Form */}
                      {activeReviewId === review.id ? (
                        <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 flex flex-col gap-4">
                          <div>
                            <span className="text-[13px] font-medium text-[#666] block mb-2">
                              Decision
                            </span>
                            <div className="flex gap-3">
                              <button
                                onClick={() => setDecision("approve")}
                                className={`flex-1 rounded-[8px] border px-4 py-2.5 text-[13px] font-medium transition-colors ${
                                  decision === "approve"
                                    ? "border-[#50e3c2]/30 bg-[#50e3c2]/10 text-[#50e3c2]"
                                    : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[#a1a1a1] hover:border-[rgba(255,255,255,0.12)]"
                                }`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setDecision("reject")}
                                className={`flex-1 rounded-[8px] border px-4 py-2.5 text-[13px] font-medium transition-colors ${
                                  decision === "reject"
                                    ? "border-[#ee0000]/30 bg-[#ee0000]/10 text-[#ee0000]"
                                    : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[#a1a1a1] hover:border-[rgba(255,255,255,0.12)]"
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
                        <div className="border-t border-[rgba(255,255,255,0.08)] pt-4">
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
              <EmptyState
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
                      <h3 className="text-[13px] font-medium text-[#ededed]">
                        {review.bounty_title ||
                          `Claim ${review.bounty_claim_id}`}
                      </h3>
                      <Badge variant={decisionVariant(review.decision || "")}>
                        {review.decision}
                      </Badge>
                    </div>
                    {review.review_notes && (
                      <p className="text-[13px] text-[#666]">
                        {review.review_notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[13px] text-[#444] font-mono">
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
