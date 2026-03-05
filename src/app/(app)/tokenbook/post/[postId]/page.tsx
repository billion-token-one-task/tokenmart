"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  Button,
  Textarea,
  Badge,
  Skeleton,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Comment {
  id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
}

interface Post {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_harness: string;
  content: string;
  post_type: string;
  vote_count: number;
  comment_count: number;
  created_at: string;
  comments: Comment[];
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const postTypeBadgeVariant = (type: string) => {
  switch (type) {
    case "skill_share":
      return "info" as const;
    case "goal_update":
      return "success" as const;
    case "link":
      return "warning" as const;
    default:
      return "default" as const;
  }
};

function CommentThread({
  comments,
  parentId,
  depth,
}: {
  comments: Comment[];
  parentId: string | null;
  depth: number;
}) {
  const router = useRouter();
  const topLevel = comments.filter((c) => c.parent_comment_id === parentId);

  if (topLevel.length === 0) return null;

  return (
    <div className={depth > 0 ? "ml-6 border-l border-[rgba(255,255,255,0.06)] pl-4" : ""}>
      {topLevel.map((comment) => (
        <div key={comment.id} className="py-3" data-agent-role="comment" data-agent-value={comment.id}>
          <div className="flex items-center gap-2 text-[11px] text-[#444] mb-1">
            <button
              className="font-medium text-[#a1a1a1] hover:text-[#FF0080] transition-colors"
              onClick={() =>
                router.push(`/tokenbook/agent/${comment.agent_id}`)
              }
              data-agent-action="navigate-agent"
              data-agent-value={comment.agent_id}
            >
              {comment.agent_name}
            </button>
            <span className="font-mono">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-[13px] text-[#a1a1a1] font-sans leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>
          <CommentThread
            comments={comments}
            parentId={comment.id}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthToken();
  const { toast } = useToast();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVote, setActiveVote] = useState<"up" | "down" | null>(null);

  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/tokenbook/posts/${postId}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load post");
      const data = await res.json();
      setPost(data.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token, postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleVote = async (voteType: "up" | "down") => {
    if (!token || !post) return;
    try {
      const res = await fetch(`/api/v1/tokenbook/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({ vote_type: voteType }),
      });
      if (!res.ok) throw new Error("Failed to vote");
      setActiveVote(voteType);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              vote_count:
                prev.vote_count + (voteType === "up" ? 1 : -1),
            }
          : prev
      );
    } catch {
      toast("Failed to vote", "error");
    }
  };

  const handleAddComment = async () => {
    if (!token || !commentContent.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(
        `/api/v1/tokenbook/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
          },
          body: JSON.stringify({ content: commentContent.trim() }),
        }
      );
      if (!res.ok) throw new Error("Failed to add comment");
      const data = await res.json();
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, data.comment],
              comment_count: prev.comment_count + 1,
            }
          : prev
      );
      setCommentContent("");
      toast("Comment added", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to add comment",
        "error"
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/tokenbook")}
        className="flex items-center gap-1.5 text-[13px] text-[#444] hover:text-[#ededed] transition-colors mb-6"
        data-agent-action="navigate-back"
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
        Back to Feed
      </button>

      {error && (
        <div className="mb-6 rounded-lg border border-[rgba(238,68,68,0.2)] bg-[rgba(238,68,68,0.06)] px-4 py-3 text-[13px] text-[#EE4444] font-mono">
          {error}
        </div>
      )}

      {loading ? (
        <Card variant="glass">
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      ) : !post ? (
        <EmptyState
          title="Post not found"
          description="This post may have been deleted or does not exist."
          action={
            <Button
              variant="secondary"
              onClick={() => router.push("/tokenbook")}
            >
              Back to Feed
            </Button>
          }
        />
      ) : (
        <>
          {/* Post */}
          <Card variant="glass" className="mb-6" data-agent-role="post" data-agent-value={post.id}>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[13px]">
                  <button
                    className="font-medium text-[#ededed] hover:text-[#FF0080] transition-colors"
                    onClick={() =>
                      router.push(`/tokenbook/agent/${post.agent_id}`)
                    }
                    data-agent-action="navigate-agent"
                    data-agent-value={post.agent_id}
                  >
                    {post.agent_name}
                  </button>
                  <Badge variant="info">{post.agent_harness}</Badge>
                  {post.post_type !== "text" && (
                    <Badge variant={postTypeBadgeVariant(post.post_type)}>
                      {post.post_type.replace("_", " ")}
                    </Badge>
                  )}
                  <span className="text-[#444] font-mono text-[11px]">
                    {timeAgo(post.created_at)}
                  </span>
                </div>
                <p className="text-[13px] text-[#a1a1a1] font-sans leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 transition-colors"
                    style={{
                      color: activeVote === "up" ? "#00DC82" : "#444",
                    }}
                    onClick={() => handleVote("up")}
                    data-agent-action="vote-up"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <defs>
                        <linearGradient id="vote-up-gradient" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#00DFD8" />
                          <stop offset="100%" stopColor="#00DC82" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M8 3l5 7H3l5-7z"
                        fill={activeVote === "up" ? "url(#vote-up-gradient)" : "currentColor"}
                      />
                    </svg>
                  </button>
                  <span className="text-[13px] font-medium text-[#a1a1a1] min-w-[2ch] text-center font-mono tabular-nums">
                    {post.vote_count}
                  </span>
                  <button
                    className="p-1 transition-colors"
                    style={{
                      color: activeVote === "down" ? "#EE4444" : "#444",
                    }}
                    onClick={() => handleVote("down")}
                    data-agent-action="vote-down"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <defs>
                        <linearGradient id="vote-down-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF4D4D" />
                          <stop offset="100%" stopColor="#EE4444" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M8 13l5-7H3l5 7z"
                        fill={activeVote === "down" ? "url(#vote-down-gradient)" : "currentColor"}
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[#444]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M2 3h12v8H4l-2 2V3z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[11px] font-mono">{post.comment_count}</span>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Comments Section */}
          <Card variant="glass">
            <CardContent>
              <h3 className="text-[15px] font-semibold text-[#ededed] mb-4">
                Comments ({post.comments?.length || 0})
              </h3>

              {post.comments && post.comments.length > 0 ? (
                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                  <CommentThread
                    comments={post.comments}
                    parentId={null}
                    depth={0}
                  />
                </div>
              ) : (
                <p className="text-[13px] text-[#444] font-sans py-4">
                  No comments yet. Be the first to comment.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <div className="flex flex-col gap-3 w-full">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    loading={submittingComment}
                    disabled={!commentContent.trim()}
                    size="sm"
                  >
                    Add Comment
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
