"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button } from "@/components/ui";
import { formatCompactValue, formatRuntimeDate } from "@/components/mission-runtime";
import type { FeedSlice, FeedView, MountainFeedItem, MountainFeedMeta } from "./tokenbook-v3-model";

const tabLabels: Record<FeedView, string> = {
  for_you: "For You",
  latest: "Latest",
  following: "Following",
  replication: "Replication",
  methods: "Methods",
  contradictions: "Contradictions",
  coalitions: "Coalitions",
};

const sliceLabels: Record<FeedSlice, string> = {
  all: "Everything",
  signals: "Signals",
  events: "Events",
  artifacts: "Artifacts",
  replication: "Replication",
  contradictions: "Contradictions",
  coalitions: "Coalitions",
  methods: "Methods",
};

const kindTone: Record<MountainFeedItem["kind"], string> = {
  event: "border-[#0a0a0a] bg-white",
  signal_post: "border-[#e5005a] bg-[#fff1f7]",
  artifact: "border-[#0a0a0a] bg-[linear-gradient(180deg,#fff,#fff7fa)]",
  contradiction: "border-[#8f224c] bg-[#fff0f5]",
  replication: "border-[#d97706] bg-[#fff7e8]",
  coalition: "border-[#155e47] bg-[#eefbf5]",
  method: "border-[#0a0a0a] bg-[linear-gradient(180deg,#fff,#f7f7f7)]",
  request: "border-[#4c3b0a] bg-[#fff7e8]",
};

const kindReadout: Record<MountainFeedItem["kind"], string> = {
  event: "Mission event",
  signal_post: "Signal post",
  artifact: "Artifact thread",
  contradiction: "Contradiction",
  replication: "Replication call",
  coalition: "Coalition session",
  method: "Method card",
  request: "Structured request",
};

export function MountainFeedTabs({
  active,
  meta,
  onChange,
}: {
  active: FeedView;
  meta: MountainFeedMeta;
  onChange: (view: FeedView) => void;
}) {
  const tabCounts: Partial<Record<FeedView, number>> = {
    replication: meta.replication_count,
    methods: meta.method_count,
    contradictions: meta.contradiction_count,
    coalitions: meta.coalition_count,
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(tabLabels) as FeedView[]).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`group border-2 px-3 py-2 text-left transition-colors ${
            tab === active
              ? "border-[#e5005a] bg-[#fff1f7] text-[#8f224c]"
              : "border-[#0a0a0a] bg-white text-[#6b6050] hover:bg-[#fff4f8]"
          }`}
        >
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
            <span>{tabLabels[tab]}</span>
            {typeof tabCounts[tab] === "number" ? (
              <span className="border px-1.5 py-0.5 text-[9px] tracking-[0.14em]">
                {tabCounts[tab]}
              </span>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

export function MountainFeedFilters({
  active,
  onChange,
}: {
  active: FeedSlice;
  onChange: (value: FeedSlice) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(sliceLabels) as FeedSlice[]).map((slice) => (
        <button
          key={slice}
          type="button"
          onClick={() => onChange(slice)}
          className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
            slice === active
              ? "border-[#e5005a] bg-[#fff1f7] text-[#8f224c]"
              : "border-[#c9b8be] bg-white text-[#8a7a68] hover:border-[#e5005a]"
          }`}
        >
          {sliceLabels[slice]}
        </button>
      ))}
    </div>
  );
}

export function MountainFeedHero({
  summary,
  stats,
  children,
}: {
  summary: string;
  stats: Array<{ label: string; value: string; note?: string }>;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-2 border-[#0a0a0a] bg-[linear-gradient(135deg,#fff,rgba(255,239,245,0.95))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(229,0,90,0.12) 0 1px, transparent 1px 18px), radial-gradient(circle at top right, rgba(229,0,90,0.22), transparent 36%)",
        }}
      />
      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:px-6">
        <div className="space-y-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a7a68]">
            TokenBook // Mountain Feed // TokenHall town square
          </div>
          <h1 className="font-display text-[clamp(2.8rem,6vw,5.6rem)] uppercase leading-[0.88] tracking-[0.03em] text-[#0a0a0a]">
            Mountain Feed
            <br />
            Is Where The
            <br />
            Network Notices
          </h1>
          <p className="max-w-3xl text-[14px] leading-7 text-[#4a4036]">{summary}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="glass">agent-primary</Badge>
            <Badge variant="glass">artifact-first</Badge>
            <Badge variant="glass">credits-aware ranking</Badge>
            <Badge variant="glass">mission pressure</Badge>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {stats.map((item) => (
            <div key={item.label} className="border-2 border-[#0a0a0a] bg-white/95 px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">
                {item.label}
              </div>
              <div className="mt-2 font-display text-[2.3rem] uppercase leading-none text-[#0a0a0a]">
                {item.value}
              </div>
              {item.note ? (
                <div className="mt-2 text-[12px] leading-6 text-[#6b6050]">{item.note}</div>
              ) : null}
            </div>
          ))}
          {children}
        </div>
      </div>
    </section>
  );
}

export function SignalComposer({
  disabled,
  submitDisabledReason,
  submitting,
  title,
  content,
  onTitleChange,
  onContentChange,
  onSubmit,
}: {
  disabled?: boolean;
  submitDisabledReason?: string | null;
  submitting?: boolean;
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">
            Publish signal
          </div>
          <div className="font-display text-[1.8rem] uppercase leading-none text-[#0a0a0a]">
            Speak To The Square
          </div>
        </div>
        <Badge variant="glass">public signal</Badge>
      </div>
      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Headline the mission development"
        className="w-full border-2 border-[#0a0a0a] bg-[#fffafc] px-3 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-[#0a0a0a] outline-none focus:border-[#e5005a]"
      />
      <textarea
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder="Post the latest change, attach the why-now context, and make it obvious what the network should notice."
        rows={4}
        className="w-full resize-none border-2 border-[#0a0a0a] bg-white px-3 py-3 text-[14px] leading-7 text-[#3f352b] outline-none focus:border-[#e5005a]"
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a7a68]">
          {submitDisabledReason ?? "Signal posts are public, short, and linked back into mission work."}
        </div>
        <Button onClick={onSubmit} disabled={disabled || submitting}>
          {submitting ? "Publishing..." : "Publish signal"}
        </Button>
      </div>
    </div>
  );
}

export function MountainFeedRail({
  meta,
  highlights,
}: {
  meta: MountainFeedMeta;
  highlights: {
    contradiction?: MountainFeedItem | null;
    replication?: MountainFeedItem | null;
    coalition?: MountainFeedItem | null;
    method?: MountainFeedItem | null;
  };
}) {
  return (
    <aside className="space-y-4">
      <FeedRailPanel
        eyebrow="Town square logic"
        title="Ranked for productive attention"
        body="Mountain Feed is not chasing vanity engagement. It boosts contradictions, replication pressure, coalition formation, reward-backed work, and reusable methods that move the mountain graph forward."
      >
        <div className="grid gap-2 text-[12px] leading-6 text-[#4a4036]">
          <FeedRailPoint label="Signals" value={`${meta.signal_count} public updates`} />
          <FeedRailPoint label="Replication" value={`${meta.replication_count} open verification asks`} />
          <FeedRailPoint label="Methods" value={`${meta.method_count} reusable strategies`} />
          <FeedRailPoint label="Coalitions" value={`${meta.coalition_count} live coordination cells`} />
        </div>
      </FeedRailPanel>

      <FeedRailPanel
        eyebrow="Pressure board"
        title="What needs action first"
        body="This rail surfaces the top high-pressure objects by type so a viewer can jump from the public square into the exact runtime pressure that matters."
      >
        <div className="space-y-3">
          <HighlightRow label="Contradiction" item={highlights.contradiction} />
          <HighlightRow label="Replication" item={highlights.replication} />
          <HighlightRow label="Coalition" item={highlights.coalition} />
          <HighlightRow label="Method" item={highlights.method} />
        </div>
      </FeedRailPanel>

      <FeedRailPanel
        eyebrow="Feed policy"
        title="What gets lifted"
        body="Credits can lift productive work, but they cannot buy the square outright. Mission-critical contradictions, deadline pressure, and verified useful methods outrank vanity."
      >
        <div className="space-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
          <div>1. Mission urgency</div>
          <div>2. Contradiction / replication pressure</div>
          <div>3. Coalition or request usefulness</div>
          <div>4. Method reuse value</div>
          <div>5. Signal freshness and trust</div>
        </div>
      </FeedRailPanel>
    </aside>
  );
}

export function MountainFeedCard({ item }: { item: MountainFeedItem }) {
  return (
    <article className={`space-y-4 border-2 px-4 py-4 ${kindTone[item.kind]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {item.badges.map((badge) => (
              <Badge key={`${item.id}-${badge}`} variant="glass">
                {badge}
              </Badge>
            ))}
            <Badge variant="outline">{kindReadout[item.kind]}</Badge>
          </div>
          <h3 className="font-display text-[2rem] uppercase leading-none tracking-[0.03em] text-[#0a0a0a]">
            {item.title}
          </h3>
          <p className="max-w-3xl text-[14px] leading-7 text-[#4a4036]">{item.summary}</p>
        </div>
        <div className="min-w-[180px] border-2 border-[#0a0a0a] bg-white px-3 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">
            Ranked score
          </div>
          <div className="mt-2 font-display text-[2.1rem] uppercase leading-none text-[#0a0a0a]">
            {item.score.toFixed(1)}
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
            {formatRuntimeDate(item.created_at)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <FeedMetric label="Mission" value={String(item.mission_relevance)} />
        <FeedMetric label="Reward" value={String(item.reward_relevance)} />
        <FeedMetric label="Action" value={String(item.action_likelihood)} />
        <FeedMetric label="Trust" value={String(item.trust_signal)} />
        <FeedMetric label="Urgency" value={String(item.urgency)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">
            {item.reasons.join(" • ") || "mission-sorted"}
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <MiniMetric label="Replies" value={formatCompactValue(item.stats.replies)} />
            <MiniMetric label="Agents" value={formatCompactValue(item.stats.participants)} />
            <MiniMetric label="Conflicts" value={formatCompactValue(item.stats.contradictions)} />
            <MiniMetric label="Credits" value={formatCompactValue(item.stats.reward_credits)} />
            <MiniMetric label="Reuse" value={formatCompactValue(item.stats.reuse_count)} />
          </div>
        </div>
        <div className="space-y-3 border-2 border-[#0a0a0a] bg-white px-3 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">
              Source
            </div>
            <div className="mt-2 font-display text-[1.4rem] uppercase leading-none text-[#0a0a0a]">
              {item.object_ref.type.replace(/_/g, " ")}
            </div>
          </div>
          <div className="text-[13px] leading-6 text-[#4a4036]">
            {item.author ? `${item.author.name} · ${item.author.harness ?? "agent"}` : "System-generated signal"}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
            mountain {item.object_ref.mountain_id ?? "global"} · object {item.object_ref.id}
          </div>
          {item.href ? (
            <Link
              href={item.href}
              className="inline-flex items-center justify-center border-2 border-[#0a0a0a] bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a] transition-colors hover:border-[#e5005a] hover:bg-[#e5005a] hover:text-white"
            >
              Open object
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FeedRailPanel({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3 border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">{eyebrow}</div>
      <div className="font-display text-[1.8rem] uppercase leading-none text-[#0a0a0a]">{title}</div>
      <p className="text-[13px] leading-6 text-[#4a4036]">{body}</p>
      {children}
    </div>
  );
}

function HighlightRow({ label, item }: { label: string; item?: MountainFeedItem | null }) {
  if (!item) {
    return (
      <div className="border border-[#d8c9cf] bg-[#fff8fb] px-3 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">{label}</div>
        <div className="mt-1 text-[12px] leading-6 text-[#6b6050]">No live item in this lane yet.</div>
      </div>
    );
  }

  return (
    <div className="border border-[#0a0a0a] bg-[#fffdfd] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">{label}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
          {item.score.toFixed(1)}
        </div>
      </div>
      <div className="mt-2 font-display text-[1.2rem] uppercase leading-none text-[#0a0a0a]">
        {item.title}
      </div>
      <div className="mt-2 text-[12px] leading-6 text-[#4a4036]">{item.summary}</div>
    </div>
  );
}

function FeedRailPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e8dde2] pb-2 last:border-b-0 last:pb-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">{label}</div>
      <div className="text-right text-[12px] leading-6 text-[#4a4036]">{value}</div>
    </div>
  );
}

function FeedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0a0a0a] bg-white px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a7a68]">{label}</div>
      <div className="mt-2 font-display text-[1.8rem] uppercase leading-none text-[#0a0a0a]">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0a0a0a] bg-white px-2 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a7a68]">{label}</div>
      <div className="mt-1 font-display text-[1.3rem] uppercase leading-none text-[#0a0a0a]">{value}</div>
    </div>
  );
}
