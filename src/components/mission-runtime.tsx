"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui";

type Tone = "brand" | "neutral" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  brand: "from-[#e5005a] via-[#ff7cab] to-[#ffd2e4]",
  neutral: "from-[#0a0a0a] via-[#565656] to-[#d4d4d4]",
  success: "from-[#0a0a0a] via-[#155e47] to-[#b7f4d7]",
  warning: "from-[#3b2506] via-[#d97706] to-[#fcd9a4]",
};

const toneChipClasses: Record<Tone, string> = {
  brand: "border-[#e5005a] bg-[#fff0f5] text-[#8f224c]",
  neutral: "border-[#0a0a0a] bg-[#f4f4f4] text-[#383838]",
  success: "border-[#155e47] bg-[#eefbf5] text-[#155e47]",
  warning: "border-[#d97706] bg-[#fff7e8] text-[#8a4b08]",
};

function relativeFromNow(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, amount] of ranges) {
    if (Math.abs(deltaSeconds) >= amount || unit === "minute") {
      return formatter.format(Math.round(deltaSeconds / amount), unit);
    }
  }

  return "just now";
}

export function formatCompactValue(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function formatRuntimeDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function RuntimeSection({
  eyebrow,
  title,
  detail,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b-2 border-[#0a0a0a] pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
            {eyebrow}
          </div>
          <h2 className="mt-1 font-display text-[2rem] uppercase leading-none tracking-[0.04em] text-[#0a0a0a]">
            {title}
          </h2>
          {detail ? (
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#4a4036]">{detail}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function TelemetryTile({
  label,
  value,
  detail,
  tone = "brand",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  return (
    <div className="group relative overflow-hidden border-2 border-[#0a0a0a] bg-white transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className={`h-2 w-full bg-gradient-to-r ${toneClasses[tone]}`}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mission-scan-sweep" aria-hidden="true" />
      <div className="space-y-3 px-4 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
          {label}
        </div>
        <div className="font-display text-[2.6rem] uppercase leading-none text-[#0a0a0a]">
          {value}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
            {detail}
          </div>
          <span className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] ${toneChipClasses[tone]}`}>
            live
          </span>
        </div>
      </div>
    </div>
  );
}

export function PhaseRail({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    count: string;
    note: string;
    active?: boolean;
  }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`relative overflow-hidden border-2 px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 ${
            item.active
              ? "border-[#e5005a] bg-[#fff1f7]"
              : "border-[#0a0a0a] bg-white"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 w-16 opacity-[0.08] ${
              item.active ? "diagonal-hatch" : "crosshatch-wide"
            }`}
            aria-hidden="true"
          />
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border-2 border-current font-mono text-[10px] uppercase tracking-[0.14em]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
                {item.label}
              </div>
              <div className="font-display text-[1.7rem] uppercase leading-none text-[#0a0a0a]">
                {item.count}
              </div>
            </div>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
            {item.note}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RuntimeHero({
  eyebrow,
  title,
  description,
  badges,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,234,242,0.9))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at top right, rgba(229,0,90,0.28), transparent 32%), repeating-linear-gradient(135deg, rgba(10,10,10,0.08) 0 1px, transparent 1px 12px)",
        }}
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 crosshatch-wide opacity-[0.12]" aria-hidden="true" />
      <div className="relative grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:px-6 lg:py-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b6050]">
            {eyebrow}
          </div>
          <h2 className="mt-2 font-display text-[clamp(2.6rem,5vw,4.8rem)] uppercase leading-[0.9] tracking-[0.03em] text-[#0a0a0a]">
            {title}
          </h2>
          <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[#4a4036]">{description}</p>
          {badges?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge} variant="glass">
                  {badge}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function MountainCard({
  href,
  name,
  status,
  ridge,
  contract,
  lease,
  deliverables,
  note,
  updatedAt,
}: {
  href: string;
  name: string;
  status: ReactNode;
  ridge: string;
  contract: string;
  lease: string;
  deliverables: string;
  note: string;
  updatedAt: string;
}) {
  return (
    <Link href={href} className="block">
      <Card variant="glass-elevated" className="h-full transition-transform duration-150 hover:-translate-y-1">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
                Mountain
              </div>
              <div className="mt-2 font-display text-[1.9rem] uppercase leading-none text-[#0a0a0a]">
                {name}
              </div>
            </div>
            {status}
          </div>
          <div
            className="h-24 border-2 border-[#0a0a0a] bg-[linear-gradient(180deg,rgba(255,243,248,0.95),rgba(255,255,255,0.95))]"
            aria-hidden="true"
          >
            <svg viewBox="0 0 320 96" className="h-full w-full">
              <path
                d="M0 78 36 56 62 63 96 26 128 41 161 18 195 35 226 12 258 42 286 28 320 52"
                fill="none"
                stroke="#e5005a"
                strokeWidth="4"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <path
                d="M0 82 42 76 96 41 128 57 161 28 196 52 228 18 258 48 320 34"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SignalPair label="Ridge" value={ridge} />
            <SignalPair label="Lease" value={lease} />
            <SignalPair label="Deliverables" value={deliverables} />
          </div>
          <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
              Work Spec
            </div>
            <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{contract}</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
              {note}
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
              {relativeFromNow(updatedAt)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SignalPair({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-[rgba(255,255,255,0.8)] px-3 py-3 transition-colors duration-200 hover:bg-[#fff4f8]">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
        {label}
      </div>
      <div className="mt-2 font-mono text-[12px] uppercase tracking-[0.12em] text-[#0a0a0a]">
        {value}
      </div>
    </div>
  );
}

export function LeaseCard({
  title,
  subtitle,
  status,
  stats,
  href,
  cta,
}: {
  title: string;
  subtitle: string;
  status: ReactNode;
  stats: Array<{ label: string; value: string }>;
  href?: string;
  cta?: string;
}) {
  const content = (
    <Card variant="glass" className="h-full transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-[1.45rem] uppercase leading-none text-[#0a0a0a]">
            {title}
          </div>
          <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{subtitle}</div>
        </div>
        {status}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat) => (
            <SignalPair key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
        {cta ? (
          <div className="pt-1">
            <span className="inline-flex border-2 border-[#0a0a0a] bg-white px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]">
              {cta}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function RuntimeList({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    description: string;
    badge: ReactNode;
    meta: string;
  }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="group relative overflow-hidden border-2 border-[#0a0a0a] bg-white px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-14 opacity-[0.07] crosshatch-wide" aria-hidden="true" />
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-display text-[1.4rem] uppercase leading-none text-[#0a0a0a]">
                {item.title}
              </div>
              <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{item.description}</div>
            </div>
            <div className="shrink-0">{item.badge}</div>
          </div>
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
            {item.meta}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MissionRibbon({
  label,
  value,
  detail,
  tone = "brand",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  return (
    <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneClasses[tone]}`} aria-hidden="true" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">{label}</div>
          <div className="mt-2 font-display text-[2rem] uppercase leading-none text-[#0a0a0a]">{value}</div>
        </div>
        <div className="max-w-sm font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a7a68]">
          {detail}
        </div>
      </div>
    </div>
  );
}

export function MissionStatusMarquee({
  items,
}: {
  items: Array<{ id: string; label: string; tone?: Tone }>;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y-2 border-[#0a0a0a] bg-[#0a0a0a] py-1.5 text-white">
      <div className="mission-marquee inline-flex min-w-full items-center gap-5">
        {doubled.map((item, index) => (
          <span key={`${item.id}-${index}`} className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
            <span className={`h-1.5 w-1.5 ${item.tone === "warning" ? "bg-[#f5a623]" : item.tone === "success" ? "bg-[#00c27f]" : "bg-[#e5005a]"}`} />
            <span>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MountainDossierCard({
  title,
  thesis,
  status,
  metrics,
  notes,
  href,
}: {
  title: string;
  thesis: string;
  status: ReactNode;
  metrics: Array<{ label: string; value: string }>;
  notes: string[];
  href?: string;
}) {
  const body = (
    <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-[linear-gradient(180deg,#fff8fb,#ffffff)]">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[#e5005a]" aria-hidden="true" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-24 opacity-[0.08] diagonal-hatch" aria-hidden="true" />
      <div className="space-y-5 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">Mountain dossier</div>
            <div className="mt-2 font-display text-[1.9rem] uppercase leading-none text-[#0a0a0a]">{title}</div>
          </div>
          {status}
        </div>
        <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3 text-[13px] leading-6 text-[#4a4036]">{thesis}</div>
        <div className="grid gap-3 sm:grid-cols-2">{metrics.map((metric) => <SignalPair key={metric.label} label={metric.label} value={metric.value} />)}</div>
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note} className="flex items-start gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
              <span className="mt-1 h-1.5 w-1.5 bg-[#e5005a]" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href} className="block transition-transform duration-200 hover:-translate-y-0.5">{body}</Link> : body;
}

export function CampaignLane({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ id: string; title: string; note: string; metric: string; badge?: ReactNode }>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="font-display text-[1.5rem] uppercase leading-none text-[#0a0a0a]">{title}</div>
        <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{subtitle}</div>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="relative overflow-hidden border-2 border-[#0a0a0a] bg-white px-4 py-4">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#e5005a]" aria-hidden="true" />
            <div className="flex flex-col gap-3 pl-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">Lane {String(index + 1).padStart(2, "0")}</div>
                <div className="mt-1 font-display text-[1.35rem] uppercase leading-none text-[#0a0a0a]">{item.title}</div>
                <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{item.note}</div>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                {item.badge}
                <span className="border border-[#0a0a0a] bg-[#fff3f8] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f224c]">
                  {item.metric}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpecPressureBoard({
  items,
}: {
  items: Array<{ id: string; title: string; pressure: string; reason: string; tone?: Tone }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="border-2 border-[#0a0a0a] bg-white">
          <div className={`h-1.5 bg-gradient-to-r ${toneClasses[item.tone ?? "brand"]}`} aria-hidden="true" />
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-[1.3rem] uppercase leading-none text-[#0a0a0a]">{item.title}</div>
              <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${toneChipClasses[item.tone ?? "brand"]}`}>
                {item.pressure}
              </span>
            </div>
            <div className="text-[13px] leading-6 text-[#4a4036]">{item.reason}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeaseTimeline({
  items,
}: {
  items: Array<{ id: string; label: string; timestamp?: string | null; active?: boolean; detail?: string }>;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span className={`h-3 w-3 border-2 border-[#0a0a0a] ${item.active ? "bg-[#e5005a]" : "bg-white"}`} />
              {index < items.length - 1 ? <span className="mt-1 h-full w-px bg-[#0a0a0a]" /> : null}
            </div>
            <div className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-display text-[1.1rem] uppercase leading-none text-[#0a0a0a]">{item.label}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a7a68]">
                  {item.timestamp ? formatRuntimeDate(item.timestamp) : "awaiting"}
                </div>
              </div>
              {item.detail ? <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{item.detail}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VerificationStack({
  items,
}: {
  items: Array<{ id: string; title: string; outcome: string; summary: string; meta: string; tone?: Tone }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-display text-[1.2rem] uppercase leading-none text-[#0a0a0a]">{item.title}</div>
              <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{item.summary}</div>
            </div>
            <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${toneChipClasses[item.tone ?? "warning"]}`}>
              {item.outcome}
            </span>
          </div>
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">{item.meta}</div>
        </div>
      ))}
    </div>
  );
}

export function RewardLedgerStrip({
  items,
}: {
  items: Array<{ id: string; role: string; amount: string; status: string; rationale: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="border-2 border-[#0a0a0a] bg-[linear-gradient(180deg,#fff4f8,#ffffff)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-display text-[1.25rem] uppercase leading-none text-[#0a0a0a]">{item.role}</div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8f224c]">{item.amount}</div>
          </div>
          <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{item.rationale}</div>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a7a68]">{item.status}</div>
        </div>
      ))}
    </div>
  );
}

export function CoalitionLobbyPanel({
  title,
  detail,
  members,
  cta,
}: {
  title: string;
  detail: string;
  members: string[];
  cta?: ReactNode;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-display text-[1.3rem] uppercase leading-none text-[#0a0a0a]">{title}</div>
          <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{detail}</div>
        </div>
        {cta}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {members.map((member) => (
          <span key={member} className="border-2 border-[#0a0a0a] bg-[#fff4f8] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">
            {member}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ArtifactLineageTable({
  rows,
}: {
  rows: Array<{ id: string; artifact: string; lineage: string; confidence: string; nextStep: string }>;
}) {
  return (
    <div className="overflow-hidden border-2 border-[#0a0a0a] bg-white">
      <div className="grid grid-cols-[1.2fr_1fr_120px_1fr] gap-0 border-b-2 border-[#0a0a0a] bg-[#fff4f8] font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
        <div className="border-r-2 border-[#0a0a0a] px-3 py-2">Artifact</div>
        <div className="border-r-2 border-[#0a0a0a] px-3 py-2">Lineage</div>
        <div className="border-r-2 border-[#0a0a0a] px-3 py-2">Confidence</div>
        <div className="px-3 py-2">Next step</div>
      </div>
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1.2fr_1fr_120px_1fr] gap-0 border-b border-[#0a0a0a] last:border-b-0 text-[13px] text-[#4a4036]">
          <div className="border-r border-[#0a0a0a] px-3 py-3">{row.artifact}</div>
          <div className="border-r border-[#0a0a0a] px-3 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">{row.lineage}</div>
          <div className="border-r border-[#0a0a0a] px-3 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8f224c]">{row.confidence}</div>
          <div className="px-3 py-3">{row.nextStep}</div>
        </div>
      ))}
    </div>
  );
}

export function BudgetEnvelopeCard({
  title,
  total,
  items,
}: {
  title: string;
  total: string;
  items: Array<{ label: string; value: number; tone?: Tone }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">Budget envelope</div>
          <div className="mt-2 font-display text-[1.45rem] uppercase leading-none text-[#0a0a0a]">{title}</div>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8f224c]">{total}</div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
              <span>{item.label}</span>
              <span>{formatCompactValue(item.value)}</span>
            </div>
            <div className="h-3 border border-[#0a0a0a] bg-[#f6f6f6]">
              <div
                className={`h-full bg-gradient-to-r ${toneClasses[item.tone ?? "brand"]}`}
                style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckpointComposerPanel({
  title,
  detail,
  draftLabel,
  children,
  actionLabel,
  actionDisabled,
  onAction,
}: {
  title: string;
  detail: string;
  draftLabel: string;
  children: ReactNode;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div>
        <div className="font-display text-[1.35rem] uppercase leading-none text-[#0a0a0a]">{title}</div>
        <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{detail}</div>
      </div>
      <div className="mt-4 border-2 border-[#0a0a0a] bg-[#fff8fb] px-3 py-3">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">{draftLabel}</div>
        {children}
      </div>
      {onAction ? (
        <div className="mt-4 flex justify-end">
          <Button onClick={onAction} disabled={actionDisabled}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  );
}

export function RuntimeEmptyState({
  eyebrow = "NO SIGNAL",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-2 border-dashed border-[#0a0a0a] bg-[rgba(255,251,253,0.95)] px-5 py-6">
      <div className="pointer-events-none absolute inset-0 crosshatch-wide opacity-20" aria-hidden="true" />
      <div className="relative">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">{eyebrow}</div>
        <div className="mt-2 font-display text-[2rem] uppercase leading-none text-[#0a0a0a]">{title}</div>
        <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#4a4036]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function RuntimeErrorPanel({
  title = "Operational Notice",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="relative overflow-hidden border-2 border-[rgba(213,61,90,0.5)] bg-[rgba(229,0,90,0.08)] px-4 py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[6px] bg-[#e5005a]" aria-hidden="true" />
      <div className="ml-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b0035]">{title}</div>
        <div className="mt-2 text-[13px] leading-6 text-[#6b243f]">{message}</div>
      </div>
    </div>
  );
}

export function RuntimeLoadingGrid({
  blocks = 4,
  lines = 3,
}: {
  blocks?: number;
  lines?: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: blocks }).map((_, index) => (
        <div key={index} className="relative overflow-hidden border-2 border-[#0a0a0a] bg-white px-4 py-4">
          <div className="absolute inset-0 scanline-overlay opacity-20" aria-hidden="true" />
          <div className="absolute inset-0 dither-bayer-4 opacity-15" aria-hidden="true" />
          <div className="relative space-y-3">
            <div className="h-2 w-16 bg-[#f3d5e2]" />
            <div className="h-8 w-28 bg-[#f6e5ed]" />
            {Array.from({ length: lines }).map((__, lineIndex) => (
              <div key={lineIndex} className="h-3 w-full bg-[#faf1f5]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
