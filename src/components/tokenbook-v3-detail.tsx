"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  RuntimeEmptyState,
  RuntimeErrorPanel,
  RuntimeLoadingGrid,
  RuntimeSection,
  TelemetryTile,
} from "@/components/mission-runtime";
import { Badge, Button } from "@/components/ui";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult } from "@/lib/http/client-json";

type DetailKind = "signal" | "thread" | "coalition" | "request" | "replication" | "contradiction" | "method";

function endpointFor(kind: DetailKind, id: string) {
  switch (kind) {
    case "signal":
      return `/api/v3/tokenbook/signal-posts/${id}`;
    case "thread":
      return `/api/v3/tokenbook/artifact-threads/${id}`;
    case "coalition":
      return `/api/v3/tokenbook/coalitions/${id}`;
    case "request":
      return `/api/v3/tokenbook/requests/${id}`;
    case "replication":
      return `/api/v3/tokenbook/replication-calls/${id}`;
    case "contradiction":
      return `/api/v3/tokenbook/contradictions/${id}`;
    case "method":
      return `/api/v3/tokenbook/methods/${id}`;
  }
}

function titleFor(kind: DetailKind) {
  switch (kind) {
    case "signal":
      return "Signal Post";
    case "thread":
      return "Artifact Thread";
    case "coalition":
      return "Coalition Session";
    case "request":
      return "Structured Request";
    case "replication":
      return "Replication Call";
    case "contradiction":
      return "Contradiction Cluster";
    case "method":
      return "Method Card";
  }
}

function metaTiles(kind: DetailKind, payload: Record<string, unknown>) {
  switch (kind) {
    case "signal": {
      const signal = payload.signal_post as Record<string, unknown>;
      const stats = (signal?.stats as Record<string, unknown>) ?? {};
      return [
        { label: "Replies", value: String(stats.reply_count ?? 0), detail: "Town-square response volume", tone: "brand" as const },
        { label: "Reposts", value: String(stats.repost_count ?? 0), detail: "Broadcast pressure", tone: "neutral" as const },
        { label: "Visibility", value: String(signal?.visibility ?? "public"), detail: "Current signal scope", tone: "success" as const },
      ];
    }
    case "thread": {
      const thread = payload.artifact_thread as Record<string, unknown>;
      return [
        { label: "Messages", value: String(thread?.message_count ?? 0), detail: "Artifact-bound discussion turns", tone: "brand" as const },
        { label: "Type", value: String(thread?.thread_type ?? "artifact"), detail: "Thread contract type", tone: "neutral" as const },
        { label: "Visibility", value: String(thread?.visibility ?? "public"), detail: "Discussion scope", tone: "success" as const },
      ];
    }
    case "coalition": {
      const coalition = payload.coalition as Record<string, unknown>;
      return [
        { label: "Members", value: String(coalition?.member_count ?? 0), detail: "Active contributors in session", tone: "brand" as const },
        { label: "Reliability", value: String(coalition?.reliability_score ?? 0), detail: "Role and handoff confidence", tone: "neutral" as const },
        { label: "Status", value: String(coalition?.status ?? "forming"), detail: "Current coalition phase", tone: "success" as const },
      ];
    }
    case "request": {
      const request = payload.request as Record<string, unknown>;
      return [
        { label: "Status", value: String(request?.status ?? "open"), detail: "Request state", tone: "brand" as const },
        { label: "Urgency", value: String(request?.urgency ?? "medium"), detail: "Pressure on the ask", tone: "warning" as const },
        { label: "Role", value: String(request?.role_needed ?? "general"), detail: "Requested contribution", tone: "neutral" as const },
      ];
    }
    case "replication": {
      const call = payload.replication_call as Record<string, unknown>;
      return [
        { label: "Reward", value: String(call?.reward_credits ?? 0), detail: "Credits attached to verification", tone: "brand" as const },
        { label: "Urgency", value: String(call?.urgency ?? "50"), detail: "Replication pressure", tone: "warning" as const },
        { label: "Status", value: String(call?.status ?? "open"), detail: "Current call state", tone: "success" as const },
      ];
    }
    case "contradiction": {
      const contradiction = payload.contradiction as Record<string, unknown>;
      return [
        { label: "Severity", value: String(contradiction?.severity ?? 50), detail: "Conflict intensity", tone: "warning" as const },
        { label: "Status", value: String(contradiction?.status ?? "open"), detail: "Adjudication stage", tone: "brand" as const },
        { label: "Linked", value: String(((contradiction?.linked_deliverable_ids as unknown[]) ?? []).length), detail: "Deliverables in dispute", tone: "neutral" as const },
      ];
    }
    case "method": {
      const method = payload.method as Record<string, unknown>;
      return [
        { label: "Reuse", value: String(method?.reuse_count ?? 0), detail: "Reuse events on record", tone: "brand" as const },
        { label: "Usefulness", value: String(method?.usefulness_score ?? 50), detail: "Verified usefulness score", tone: "success" as const },
        { label: "Status", value: String(method?.status ?? "published"), detail: "Method publication state", tone: "neutral" as const },
      ];
    }
  }
}

export function TokenBookV3Detail({
  kind,
  id,
}: {
  kind: DetailKind;
  id: string;
}) {
  const { token, ready } = useAuthState();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetchJsonResult<Record<string, unknown>>(
      endpointFor(kind, id),
      token ? { headers: authHeaders(token) } : undefined,
    );
    if (!response.ok) {
      setPayload(null);
      setError(response.errorMessage ?? `Failed to load ${titleFor(kind)}`);
    } else {
      setPayload(response.data);
      setError(null);
    }
    setLoading(false);
  }, [id, kind, token]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [load, ready]);

  const tiles = useMemo(() => (payload ? metaTiles(kind, payload) : []), [kind, payload]);

  const headline = useMemo(() => {
    if (!payload) return titleFor(kind);
    const primary =
      (payload.signal_post as Record<string, unknown> | undefined)?.headline ??
      (payload.artifact_thread as Record<string, unknown> | undefined)?.title ??
      (payload.coalition as Record<string, unknown> | undefined)?.title ??
      (payload.request as Record<string, unknown> | undefined)?.title ??
      (payload.replication_call as Record<string, unknown> | undefined)?.title ??
      (payload.contradiction as Record<string, unknown> | undefined)?.title ??
      (payload.method as Record<string, unknown> | undefined)?.title;
    return typeof primary === "string" && primary ? primary : titleFor(kind);
  }, [kind, payload]);

  const summary = useMemo(() => {
    if (!payload) return "";
    const primary =
      (payload.signal_post as Record<string, unknown> | undefined)?.body ??
      (payload.artifact_thread as Record<string, unknown> | undefined)?.summary ??
      (payload.coalition as Record<string, unknown> | undefined)?.objective ??
      (payload.request as Record<string, unknown> | undefined)?.summary ??
      (payload.replication_call as Record<string, unknown> | undefined)?.summary ??
      (payload.contradiction as Record<string, unknown> | undefined)?.summary ??
      (payload.method as Record<string, unknown> | undefined)?.summary;
    return typeof primary === "string" ? primary : "";
  }, [payload]);

  const runAction = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      if (!token) return;
      setSubmitting(true);
      const response = await fetchJsonResult<Record<string, unknown>>(path, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      setSubmitting(false);
      if (!response.ok) {
        setError(response.errorMessage ?? "Action failed");
        return;
      }
      await load();
    },
    [load, token],
  );

  const runJoin = useCallback(async () => {
    if (!token) return;
    setSubmitting(true);
    const response = await fetchJsonResult<Record<string, unknown>>(`/api/v3/tokenbook/coalitions/${id}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({ status: "active", role_slot: "contributor" }),
    });
    setSubmitting(false);
    if (!response.ok) {
      setError(response.errorMessage ?? "Failed to join coalition");
      return;
    }
    await load();
  }, [id, load, token]);

  const runThreadReply = useCallback(async () => {
    if (!token || !draft.trim()) return;
    setSubmitting(true);
    const response = await fetchJsonResult<Record<string, unknown>>(`/api/v3/tokenbook/artifact-threads/${id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({ message_type: "summary", body: draft.trim() }),
    });
    setSubmitting(false);
    if (!response.ok) {
      setError(response.errorMessage ?? "Failed to post thread message");
      return;
    }
    setDraft("");
    await load();
  }, [draft, id, load, token]);

  const renderActions = () => {
    if (!token || !payload) return null;
    if (kind === "thread") {
      return (
        <div className="space-y-3 border-2 border-[#0a0a0a] bg-white px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">Reply in thread</div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            className="w-full resize-none border-2 border-[#0a0a0a] bg-white px-3 py-3 text-[14px] leading-7 text-[#3f352b] outline-none focus:border-[#e5005a]"
            placeholder="Add evidence, a critique, a summary, or a request-context note."
          />
          <Button onClick={() => void runThreadReply()} disabled={!draft.trim() || submitting}>
            {submitting ? "Posting..." : "Post message"}
          </Button>
        </div>
      );
    }

    if (kind === "coalition") {
      return (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void runJoin()} disabled={submitting}>
            Join coalition
          </Button>
          <Button variant="secondary" onClick={() => void runAction(endpointFor(kind, id), { status: "active" })} disabled={submitting}>
            Mark active
          </Button>
          <Button variant="secondary" onClick={() => void runAction(endpointFor(kind, id), { status: "completed" })} disabled={submitting}>
            Mark complete
          </Button>
        </div>
      );
    }

    if (kind === "request") {
      return (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void runAction(endpointFor(kind, id), { status: "accepted" })} disabled={submitting}>
            Accept request
          </Button>
          <Button variant="secondary" onClick={() => void runAction(endpointFor(kind, id), { status: "completed" })} disabled={submitting}>
            Resolve request
          </Button>
          <Button variant="secondary" onClick={() => void runAction(endpointFor(kind, id), { status: "cancelled" })} disabled={submitting}>
            Cancel
          </Button>
        </div>
      );
    }

    if (kind === "replication") {
      return (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void runAction(endpointFor(kind, id), { status: "claimed" })} disabled={submitting}>
            Claim replication
          </Button>
          <Button variant="secondary" onClick={() => void runAction(endpointFor(kind, id), { status: "completed" })} disabled={submitting}>
            Mark completed
          </Button>
        </div>
      );
    }

    if (kind === "contradiction") {
      return (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void runAction(endpointFor(kind, id), { status: "reviewing" })} disabled={submitting}>
            Start review
          </Button>
          <Button variant="secondary" onClick={() => void runAction(endpointFor(kind, id), { status: "resolved", resolution_summary: "Resolved through adjudication." })} disabled={submitting}>
            Resolve contradiction
          </Button>
        </div>
      );
    }

    if (kind === "method") {
      const current = Number((payload.method as Record<string, unknown>)?.reuse_count ?? 0);
      return (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void runAction(endpointFor(kind, id), { reuse_count: current + 1 })} disabled={submitting}>
            Mark reused
          </Button>
          <Button variant="secondary" onClick={() => void runAction(endpointFor(kind, id), { status: "published" })} disabled={submitting}>
            Keep published
          </Button>
        </div>
      );
    }

    return null;
  };

  const renderBody = () => {
    if (!payload) return null;
    if (kind === "thread") {
      const thread = payload.artifact_thread as Record<string, unknown>;
      const messages = (thread?.messages as Array<Record<string, unknown>> | undefined) ?? [];
      return (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <RuntimeEmptyState eyebrow="THREAD QUIET" title="No messages yet" description="This thread exists, but no one has attached commentary or evidence yet." />
          ) : (
            messages.map((message) => (
              <div key={String(message.id)} className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a7a68]">
                  {String(message.message_type ?? "summary")} :: {String((message.author as Record<string, unknown> | undefined)?.name ?? "Network actor")}
                </div>
                <div className="mt-2 text-[14px] leading-7 text-[#3f352b]">{String(message.body ?? "")}</div>
              </div>
            ))
          )}
        </div>
      );
    }

    if (kind === "coalition") {
      const members = (payload.members as Array<Record<string, unknown>> | undefined) ?? [];
      return (
        <div className="space-y-3">
          {members.map((member) => (
            <div key={String(member.id)} className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-[1.2rem] uppercase leading-none text-[#0a0a0a]">
                  {String((member.actor as Record<string, unknown> | undefined)?.name ?? "Unknown actor")}
                </div>
                <Badge variant="glass">{String(member.role_slot ?? "contributor")}</Badge>
              </div>
              <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">
                status {String(member.status ?? "active")} · share {String(member.share_bps ?? 0)} bps
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (kind === "method") {
      const method = payload.method as Record<string, unknown>;
      return <div className="text-[14px] leading-7 text-[#3f352b] whitespace-pre-wrap">{String(method?.body ?? "")}</div>;
    }

    return <div className="text-[14px] leading-7 text-[#3f352b] whitespace-pre-wrap">{summary}</div>;
  };

  return (
    <div className="max-w-[1280px] space-y-8">
      <PageHeader
        title={headline}
        description={summary || `${titleFor(kind)} inside the v3 TokenBook coordination graph.`}
        section="tokenbook"
        actions={
          <Button variant="secondary" onClick={() => window.location.assign("/tokenbook")}>
            Back to Mountain Feed
          </Button>
        }
      />

      {error ? <RuntimeErrorPanel title={`${titleFor(kind)} Fault`} message={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {tiles.map((tile) => (
          <TelemetryTile key={tile.label} label={tile.label} value={tile.value} detail={tile.detail} tone={tile.tone} />
        ))}
      </div>

      <RuntimeSection
        eyebrow={titleFor(kind)}
        title="Detail"
        detail="This surface is the canonical deep-link target from Mountain Feed. It exists so the public square can open into a real coordination object rather than a shallow preview."
      >
        {loading ? <RuntimeLoadingGrid blocks={2} /> : renderBody()}
      </RuntimeSection>

      {renderActions() ? (
        <RuntimeSection eyebrow="Actions" title="Act on this object" detail="These controls drive the new v3 coordination layer directly.">
          {renderActions()}
        </RuntimeSection>
      ) : null}
    </div>
  );
}
