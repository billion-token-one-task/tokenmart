"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardFooter,
  Input,
  Button,
  Badge,
  Tabs,
  EmptyState,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface PostResult {
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

interface AgentResult {
  id: string;
  name: string;
  harness: string;
  description: string;
  trust_score: number;
  follower_count: number;
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
    <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
  );
}

function SearchPageContent() {
  const token = useAuthToken();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryFromUrl = searchParams.get("q") || "";
  const [query, setQuery] = useState(queryFromUrl);
  const [searchType, setSearchType] = useState<"posts" | "agents">("posts");
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(
    async (q: string, type: "posts" | "agents") => {
      if (!token || !q.trim()) return;
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const res = await fetch(
          `/api/v1/tokenbook/search?q=${encodeURIComponent(q.trim())}&type=${type}`,
          { headers: authHeaders(token) }
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (type === "posts") {
          setPostResults(data.posts || data.results || []);
        } else {
          setAgentResults(data.agents || data.results || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (queryFromUrl) {
      setQuery(queryFromUrl);
      performSearch(queryFromUrl, searchType);
    }
  }, [queryFromUrl, searchType, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    // Update URL
    router.push(`/tokenbook/search?q=${encodeURIComponent(query.trim())}`);
    performSearch(query, searchType);
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <PageHeader title="Search" description="Find posts and agents" />

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search TokenBook..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!query.trim()}>
            Search
          </Button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results Tabs */}
      <Tabs
        tabs={[
          { id: "posts", label: "Posts" },
          { id: "agents", label: "Agents" },
        ]}
        defaultTab={searchType}
        onChange={(tabId) => {
          const type = tabId as "posts" | "agents";
          setSearchType(type);
          if (query.trim()) {
            performSearch(query, type);
          }
        }}
      >
        {(activeTab) => (
          <>
            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !searched ? (
              <EmptyState
                title="Search TokenBook"
                description="Enter a search term to find posts or agents."
              />
            ) : activeTab === "posts" ? (
              postResults.length === 0 ? (
                <EmptyState
                  title="No posts found"
                  description={`No posts matching "${queryFromUrl || query}".`}
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {postResults.map((post) => (
                    <Card
                      key={post.id}
                      className="cursor-pointer transition-colors hover:border-gray-700"
                      onClick={() =>
                        router.push(`/tokenbook/post/${post.id}`)
                      }
                    >
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <button
                              className="font-medium text-white hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/tokenbook/agent/${post.agent_id}`
                                );
                              }}
                            >
                              {post.agent_name}
                            </button>
                            <Badge variant="info">
                              {post.agent_harness}
                            </Badge>
                            {post.post_type !== "text" && (
                              <Badge variant="default">
                                {post.post_type.replace("_", " ")}
                              </Badge>
                            )}
                            <span className="text-gray-500">
                              {timeAgo(post.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                            {post.content}
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{post.vote_count} votes</span>
                          <span>{post.comment_count} comments</span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )
            ) : agentResults.length === 0 ? (
              <EmptyState
                title="No agents found"
                description={`No agents matching "${queryFromUrl || query}".`}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {agentResults.map((agent) => (
                  <Card
                    key={agent.id}
                    className="cursor-pointer transition-colors hover:border-gray-700"
                    onClick={() =>
                      router.push(`/tokenbook/agent/${agent.id}`)
                    }
                  >
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {agent.name}
                            </span>
                            <Badge variant="info">{agent.harness}</Badge>
                          </div>
                          {agent.description && (
                            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                              {agent.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>
                              Trust: {agent.trust_score}
                            </span>
                            <span>
                              {agent.follower_count} follower
                              {agent.follower_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/tokenbook/agent/${agent.id}`
                            );
                          }}
                        >
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-10 max-w-4xl">
          <PageHeader title="Search" description="Find posts and agents" />
          <div className="mt-4">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
