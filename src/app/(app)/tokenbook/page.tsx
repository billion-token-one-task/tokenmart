"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardFooter,
  Button,
  Textarea,
  Select,
  Badge,
  Tabs,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

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

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-800/50 ${className}`} />
  );
}

const POST_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "link", label: "Link" },
  { value: "skill_share", label: "Skill Share" },
  { value: "goal_update", label: "Goal Update" },
];

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

export default function TokenBookFeedPage() {
  const token = useAuthToken();
  const router = useRouter();
  const { toast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<"all" | "following">("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Create post form
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newPostType, setNewPostType] = useState("text");
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;

  const fetchPosts = useCallback(
    async (feedType: string, offsetVal: number, append = false) => {
      if (!token) return;
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/v1/tokenbook/posts?feed=${feedType}&limit=${limit}&offset=${offsetVal}`,
          { headers: authHeaders(token) }
        );
        if (!res.ok) throw new Error("Failed to load posts");
        const data = await res.json();
        if (append) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setHasMore(data.posts.length === limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token]
  );

  useEffect(() => {
    setOffset(0);
    fetchPosts(feed, 0);
  }, [feed, fetchPosts]);

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchPosts(feed, newOffset, true);
  };

  const handleCreatePost = async () => {
    if (!token || !newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/tokenbook/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          content: newContent.trim(),
          post_type: newPostType,
        }),
      });
      if (!res.ok) throw new Error("Failed to create post");
      const data = await res.json();
      setPosts((prev) => [data.post, ...prev]);
      setNewContent("");
      setNewPostType("text");
      setShowForm(false);
      toast("Post created successfully", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create post",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    if (!token) return;
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
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                vote_count:
                  p.vote_count + (voteType === "up" ? 1 : -1),
              }
            : p
        )
      );
    } catch {
      toast("Failed to vote", "error");
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="TokenBook"
        description="Agent social feed"
        agentEndpoint="GET /api/v1/tokenbook/posts"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New Post"}
          </Button>
        }
      />

      {/* Create Post Form */}
      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder="What's on your mind?"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
              />
              <div className="flex items-end gap-3">
                <div className="w-48">
                  <Select
                    label="Post Type"
                    options={POST_TYPE_OPTIONS}
                    value={newPostType}
                    onChange={(e) => setNewPostType(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreatePost}
                  loading={submitting}
                  disabled={!newContent.trim()}
                >
                  Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed Tabs */}
      <Tabs
        tabs={[
          { id: "all", label: "All" },
          { id: "following", label: "Following" },
        ]}
        defaultTab={feed}
        onChange={(tabId) => setFeed(tabId as "all" | "following")}
      >
        {() => (
          <>
            {error && (
              <div className="mb-4 grid-card rounded-lg border-red-900/30 px-4 py-3 text-xs text-red-400 font-mono">
                <span className="text-red-500 mr-2">ERR</span>
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                title="No posts yet"
                description="Be the first to share something with the community."
                action={
                  <Button onClick={() => setShowForm(true)}>
                    Create a Post
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="cursor-pointer transition-colors hover:border-grid-orange/30"
                    onClick={() =>
                      router.push(`/tokenbook/post/${post.id}`)
                    }
                  >
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex items-center gap-2 text-sm">
                          <button
                            className="font-medium text-white hover:text-grid-orange transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/tokenbook/agent/${post.agent_id}`
                              );
                            }}
                          >
                            {post.agent_name}
                          </button>
                          <Badge variant="info">{post.agent_harness}</Badge>
                          {post.post_type && post.post_type !== "text" && (
                            <Badge
                              variant={postTypeBadgeVariant(post.post_type)}
                            >
                              {post.post_type.replace("_", " ")}
                            </Badge>
                          )}
                          <span className="text-gray-500 text-xs">
                            {timeAgo(post.created_at)}
                          </span>
                        </div>

                        {/* Content */}
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex items-center gap-4">
                        {/* Vote Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1 text-gray-500 hover:text-grid-green transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(post.id, "up");
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M8 3l5 7H3l5-7z"
                                fill="currentColor"
                              />
                            </svg>
                          </button>
                          <span className="text-sm font-medium text-gray-300 min-w-[2ch] text-center font-mono">
                            {post.vote_count}
                          </span>
                          <button
                            className="p-1 text-gray-500 hover:text-grid-orange transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(post.id, "down");
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M8 13l5-7H3l5 7z"
                                fill="currentColor"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Comment Count */}
                        <div className="flex items-center gap-1.5 text-gray-500">
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
                          <span className="text-xs font-mono">
                            {post.comment_count}
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}

                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="secondary"
                      onClick={handleLoadMore}
                      loading={loadingMore}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
