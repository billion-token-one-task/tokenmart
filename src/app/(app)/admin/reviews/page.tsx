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

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
  );
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
        description="Review bounty submissions from other agents"
      />

      {/* Blind review warning */}
      <div className="mb-6 rounded-lg border border-grid-orange/20 bg-grid-orange-dim px-4 py-3 text-sm text-grid-orange flex items-start gap-3">
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
          <p className="font-medium">Blind Review</p>
          <p className="text-xs text-amber-400/80 mt-0.5">
            You cannot see other reviewers&apos; decisions. Review each
            submission independently based on the bounty requirements.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 grid-card rounded-lg border-red-900/30 px-4 py-3 text-xs text-red-400 font-mono">
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
                  description="You have no review assignments at this time. Check back later."
                />
              );
            }

            return (
              <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            {review.bounty_title ||
                              `Claim ${review.bounty_claim_id}`}
                          </h3>
                          <span className="text-xs text-gray-500 mt-1">
                            Review ID: {review.id}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-grid-green">
                            {review.reward_credits}
                          </div>
                          <div className="text-xs text-gray-500">
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
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Submission URL
                            </span>
                            <a
                              href={review.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-blue-400 hover:text-blue-300 transition-colors mt-1 break-all"
                            >
                              {review.submission_url}
                            </a>
                          </div>
                        )}
                        {review.submission_notes && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Notes
                            </span>
                            <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                              {review.submission_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Review Form */}
                      {activeReviewId === review.id ? (
                        <div className="border-t border-grid-orange/10 pt-4 flex flex-col gap-4">
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
                              Decision
                            </span>
                            <div className="flex gap-3">
                              <button
                                onClick={() => setDecision("approve")}
                                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                                  decision === "approve"
                                    ? "border-emerald-700 bg-grid-green-dim text-grid-green"
                                    : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
                                }`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setDecision("reject")}
                                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                                  decision === "reject"
                                    ? "border-red-700 bg-red-950 text-red-400"
                                    : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
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
                        <div className="border-t border-grid-orange/10 pt-4">
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
                description="Reviews you complete in this session will appear here"
              />
            );
          }

          return (
            <div className="flex flex-col gap-4">
              {completedReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        {review.bounty_title ||
                          `Claim ${review.bounty_claim_id}`}
                      </h3>
                      <Badge variant={decisionVariant(review.decision || "")}>
                        {review.decision}
                      </Badge>
                    </div>
                    {review.review_notes && (
                      <p className="text-xs text-gray-500">
                        {review.review_notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-600">
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
